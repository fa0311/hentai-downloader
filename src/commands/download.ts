import { Args, Command, Flags } from "@oclif/core";
import "dotenv/config";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { Semaphore } from "async-mutex";
import { createSafeRequest, fillFilenamePlaceholders, fillGalleryPlaceholders, getGalleryIds, isZipFile } from "./../download.js";
import { downloadGallery, getContentHostname, toFormatExt, toFormatType } from "./../source/gallery.js";
import { parseSourceUrl } from "./../source/url.js";
import { differenceUint32Collections } from "../utils/bitmap.js";
import { catchError } from "../utils/catch.js";
import { loadCheckpoint, toCheckpoint } from "../utils/checkpoint.js";
import { galleryInfoToComicInfo } from "./../utils/comicInfo.js";
import { outputDir, outputZip } from "./../utils/dir.js";
import { HentaiAlreadyExistsError } from "../utils/error.js";
import { outputFile } from "../utils/file.js";
import { getChromeHeader } from "./../utils/header.js";
import { info, title, warning } from "../utils/log.js";
import { exhaustiveMatchAsync } from "../utils/match.js";
import { progress } from "./../utils/progress.js";
import { initProxy } from "./../utils/proxy.js";

const parseInput = async (input: string, additionalHeaders?: Record<string, string>) => {
	const parsedUrl = parseSourceUrl(input);
	switch (parsedUrl.discriminator) {
		case "gallery":
			return { galleryIds: [parsedUrl.galleryId], hostname: parsedUrl.hostname };
		case "search": {
			return { galleryIds: await getGalleryIds({ query: parsedUrl, additionalHeaders }), hostname: parsedUrl.hostname };
		}
	}
};

export default class Download extends Command {
	static description = "Download galleries by ID or URL";

	static examples = [
		{
			description: "Download a gallery by ID",
			command: "<%= config.bin %> download 1571033",
		},
		{
			description: "Download a gallery by URL",
			command: "<%= config.bin %> download https://example.com/artist/sample-creator-japanese.html",
		},
		{
			description: "Download as CBZ file",
			command: "<%= config.bin %> download 1571033 output/{id}.cbz",
		},
		{
			description: "Download with custom filename pattern",
			command: '<%= config.bin %> download 1571033 output/{id} "{no}-{name}{ext}"',
		},
		{
			description: "Resume from checkpoint",
			command: "<%= config.bin %> download 1571033 --checkpoint=.checkpoint --ifExists=overwrite",
		},
	];

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
		imageFormat: Flags.custom<"webp" | "avif">({
			description: "Force image download format",
			options: ["webp", "avif"],
		})(),
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
		const paesedGalleryIds = await parseInput(args.input, additionalHeaders);
		const contentHostname = await getContentHostname(paesedGalleryIds.hostname, additionalHeaders);
		const galleryIds = await (async () => {
			if (flags.checkpoint) {
				const checkPoints = await loadCheckpoint(flags.checkpoint);
				const find = checkPoints?.find((cp) => cp.hostname === paesedGalleryIds.hostname);
				if (find) {
					return differenceUint32Collections([paesedGalleryIds.galleryIds, find.galleryIds]);
				}
			}
			return paesedGalleryIds.galleryIds;
		})();

		await outputFile(async (checkpointDiscriptor) => {
			const checkpoint = flags.checkpoint ? await checkpointDiscriptor.create(flags.checkpoint, "a") : null;
			await progress({ hidden: flags.quiet }, async (multiBar) => {
				const opt = { total: galleryIds.length, filename: "Overall", hidden: galleryIds.length <= 1 };
				await multiBar.create(opt, async (b1) => {
					for (const galleryId of galleryIds) {
						const hostname = paesedGalleryIds.hostname;
						const [galleries, allTasks] = await downloadGallery({ hostname, galleryId, contentHostname, additionalHeaders });
						const tasks = flags.videoSkip ? allTasks.filter((task) => task.type !== "video") : allTasks;
						const pathname = fillGalleryPlaceholders(args.output, galleries);
						const fd = isZipFile(pathname) ? await outputZip(pathname) : await outputDir(pathname);
						const fdFactory = exhaustiveMatchAsync({
							error: async () => {
								throw new HentaiAlreadyExistsError(`File or directory already exists: ${pathname}`);
							},
							skip: async () => {
								multiBar.log(warning(`Skipping existing file or directory: ${pathname}`));
								return undefined;
							},
							overwrite: async () => {
								multiBar.log(warning(`Overwriting existing file or directory: ${pathname}`));
								await fd.remove();
								return fd;
							},
						});
						const outputDescriptor = fd.exists ? await fdFactory(flags.ifExists) : fd;
						await outputDescriptor?.create(async (fd) => {
							const safeRequest = await createSafeRequest({ signal: fd.signal, maxRetries: 10 });
							const opt = { total: tasks.length, filename: galleries.japanese_title ?? galleries.title, hidden: false };
							await multiBar.create(opt, async (b2) => {
								if (flags.metadata) fd.writeFile(`galleries.json`, JSON.stringify(galleries, undefined, 2));
								if (flags.comicInfo) fd.writeFile(`ComicInfo.xml`, galleryInfoToComicInfo(galleries, hostname));
								const semaphore = new Semaphore(10);
								const promises = tasks.map(async (task, i, all) => {
									await semaphore.runExclusive(async () => {
										const [response, filename] = await (async () => {
											switch (task.type) {
												case "image": {
													const type = flags.imageFormat ?? toFormatType(task.file);
													const filename = fillFilenamePlaceholders(args.filename, i, all.length, toFormatExt(type), task.file);
													const response = await safeRequest(async () => task.callback(fd.signal, type));
													return [response, filename];
												}
												case "video": {
													const filename = fillFilenamePlaceholders(args.filename, i, all.length, task.file.ext, task.file);
													const response = await safeRequest(async () => task.callback(fd.signal));
													return [response, filename];
												}
											}
										})();
										await fd.throwIfErrors();
										const readStream = Readable.fromWeb(response.body);
										fd.writeStream(filename, readStream);
										b2.increment();
										await finished(readStream).catch(() => {});
									});
								});
								await Promise.all(promises);
							});
						});
						await checkpoint?.line(toCheckpoint(galleryId, hostname));
						b1.increment();
					}
				});
			});
		});
	}
	async catch(error: Error) {
		this.log(catchError(error));
		process.exitCode = 1;
	}
}
