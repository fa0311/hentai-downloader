import { Args, Command, Flags } from "@oclif/core";
import "dotenv/config";
import { Readable } from "node:stream";
import { createSafeRequest, fillFilenamePlaceholders, fillGalleryPlaceholders, getHitomiMangaList, isZipFile } from "./../download";
import { downloadHitomiGalleries } from "./../hitomi/gallery";
import { parseHitomiUrl } from "./../hitomi/url";
import { differenceUint32Collections } from "../utils/bitmap";
import { catchError } from "../utils/catch";
import { loadCheckpoint } from "../utils/checkpoint";
import { galleryInfoToComicInfo } from "./../utils/comicInfo";
import { outputDir, outputZip } from "./../utils/dir";
import { HentaiAlreadyExistsError } from "../utils/error";
import { outputFile } from "../utils/file";
import { getChromeHeader } from "./../utils/header";
import { info, title, warning } from "../utils/log";
import { exhaustiveMatchAsync } from "../utils/match";
import { progress } from "./../utils/progress";
import { initProxy } from "./../utils/proxy";

const parseInput = async (input: string, additionalHeaders?: Record<string, string>) => {
	const isGalleryId = /^[0-9]+$/.test(input);
	if (isGalleryId) {
		return [Number(input)];
	} else {
		const parsedUrl = parseHitomiUrl(input);
		if (typeof parsedUrl === "number") {
			return [parsedUrl];
		} else {
			return await getHitomiMangaList({ query: parsedUrl, additionalHeaders });
		}
	}
};

export class Download extends Command {
	static description = "Hentai Downloader CLI";
	static args = {
		input: Args.string({
			required: true,
			description: "http(s) URL or gallery ID to download",
		}),
		output: Args.string({
			required: true,
			description: "Output directory or file",
			default: "output/{id}",
		}),
		filename: Args.string({
			required: false,
			description: "Output filename",
			default: "{no}{ext}",
		}),
	};

	static flags = {
		metadata: Flags.boolean({
			description: "Output metadata file",
			default: false,
		}),
		comicInfo: Flags.boolean({
			description: "Output ComicInfo.xml file",
			default: true,
		}),
		videoSkip: Flags.boolean({
			description: "Skip video files",
			default: true,
		}),
		quiet: Flags.boolean({
			char: "q",
			description: "Suppress non-error output",
			default: false,
		}),
		checkpoint: Flags.string({
			description: "Path to checkpoint file",
		}),
		ifExists: Flags.custom<"error" | "skip" | "overwrite">({
			description: "Behavior when file already exists",
			options: ["error", "skip", "overwrite"],
			default: "error",
		})(),
		help: Flags.help(),
		version: Flags.version(),
	};

	async run() {
		this.log(title("Hentai Downloader"));
		const { args, flags } = await this.parse(Download);
		if (initProxy()) this.log(info("Proxy enabled"));

		const additionalHeaders = await getChromeHeader();
		const checkPoints = await loadCheckpoint(flags.checkpoint);
		const paesedGalleryIds = await parseInput(args.input, additionalHeaders);
		const galleryIds = differenceUint32Collections([paesedGalleryIds, checkPoints]);
		const safeRequest = await createSafeRequest();
		if (checkPoints.length > 0) {
			const diff = paesedGalleryIds.length - galleryIds.length;
			this.log(info(`Skipping ${diff} already downloaded galleries via checkpoint`));
		}
		await outputFile(async (checkpointDiscriptor) => {
			const checkpoint = flags.checkpoint ? await checkpointDiscriptor.create(flags.checkpoint, "a") : null;
			await progress({ hidden: flags.quiet }, async (multiBar) => {
				const opt = { total: galleryIds.length, filename: "Overall", hidden: galleryIds.length <= 1 };
				await multiBar.create(opt, async (b1) => {
					for (const galleryId of galleryIds) {
						const [galleries, allTasks] = await downloadHitomiGalleries({ galleryId, additionalHeaders });
						const tasks = flags.videoSkip ? allTasks.filter((task) => task.type !== "video") : allTasks;
						const pathname = fillGalleryPlaceholders(args.output, galleries);
						const fd = isZipFile(pathname) ? await outputZip(pathname) : await outputDir(pathname);
						const fdFactory = exhaustiveMatchAsync({
							error: async () => {
								throw new HentaiAlreadyExistsError(`File or directory already exists: ${pathname}`);
							},
							skip: async () => {
								multiBar.log(warning(`Skipping existing file or directory: ${pathname}`));
								return null;
							},
							overwrite: async () => {
								multiBar.log(warning(`Overwriting existing file or directory: ${pathname}`));
								await fd.remove();
								return fd;
							},
						});
						const outputDescriptor = fd.exists ? await fdFactory(flags.ifExists) : fd;
						await outputDescriptor?.create(async (fd) => {
							const opt = { total: tasks.length, filename: galleries.japanese_title ?? galleries.title, hidden: false };
							await multiBar.create(opt, async (b2) => {
								if (flags.metadata) fd.writeFile(`galleries.json`, JSON.stringify(galleries, undefined, 2));
								if (flags.comicInfo) fd.writeFile(`ComicInfo.xml`, galleryInfoToComicInfo(galleries));
								const promises = tasks.map(async (task, i, all) => {
									const filename = fillFilenamePlaceholders(args.filename, i, all.length, task.file);
									const response = await safeRequest(() => task.callback());
									const readStream = Readable.fromWeb(response.body!);
									fd.writeStream(filename, readStream);
									b2.increment();
								});
								await Promise.all(promises);
							});
							await checkpoint?.line(String(galleryId));
						});
						b1.increment();
					}
				});
			});
		});
	}
	async catch(error: Error) {
		this.log(catchError(error));
	}
}
