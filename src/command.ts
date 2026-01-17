import { Args, Command, Flags } from "@oclif/core";
import boxen from "boxen";
import chalk from "chalk";
import "dotenv/config";
import { Readable } from "node:stream";
import ErrorStackParser from "error-stack-parser";
import logSymbols from "log-symbols";
import {
	createSafeRequest,
	fillFilenamePlaceholders,
	fillGalleryPlaceholders,
	getHitomiMangaList,
	isZipFile,
} from "./download";
import { downloadHitomiGalleries } from "./hitomi/gallery";
import { parseHitomiUrl } from "./hitomi/url";
import { galleryInfoToComicInfo } from "./utils/comicInfo";
import { outputDir, outputZip } from "./utils/dir";
import { getChromeHeader } from "./utils/header";
import { progress } from "./utils/progress";
import { initProxy } from "./utils/proxy";

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

export class MainCommand extends Command {
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
		help: Flags.help(),
		version: Flags.version(),
	};

	async run() {
		const title = chalk.bold("     🚀 Hentai Downloader     ");
		this.log(`${boxen(`${title}`, { padding: 1, borderStyle: "double" })}`);
		const { args, flags } = await this.parse(MainCommand);
		const additionalHeaders = await getChromeHeader();
		const galleryIds = await parseInput(args.input, additionalHeaders);
		const safeRequest = await createSafeRequest();
		if (initProxy()) this.log(chalk.cyan(`${logSymbols.info} Proxy enabled`));

		await progress({ hidden: flags.quiet }, async (multiBar) => {
			const opt = { total: galleryIds.length, filename: "Overall", hidden: galleryIds.length <= 1 };
			await multiBar.create(opt, async (b1) => {
				for (const galleryId of galleryIds) {
					const [galleries, allTasks] = await downloadHitomiGalleries({ galleryId, additionalHeaders });
					const tasks = flags.videoSkip ? allTasks.filter((task) => task.type !== "video") : allTasks;
					const pathname = fillGalleryPlaceholders(args.output, galleries);
					const fd = isZipFile(pathname) ? await outputZip(pathname) : await outputDir(pathname);
					const opt = { total: tasks.length, filename: galleries.japanese_title ?? galleries.title, hidden: false };
					await multiBar.create(opt, async (b2) => {
						await fd(async (fd) => {
							if (flags.metadata) fd.writeFile(`galleries.json`, JSON.stringify(galleries, null, 2));
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
					});
					b1.increment();
				}
			});
		});
	}
	async catch(error: Error) {
		const frames = ErrorStackParser.parse(error);
		const className = (error as any)?.constructor?.name ?? "<unknown>";
		const trace = boxen(chalk.gray(frames.map((f) => `at ${f.toString()}`).join("\n")), {
			padding: 1,
			borderColor: "gray",
		});
		this.log(
			boxen(`${chalk.red(`${chalk.bold(className)}\n\n${error.message}`)}\n\n${trace}`, {
				padding: 1,
				borderColor: "red",
			}),
		);
	}
}
