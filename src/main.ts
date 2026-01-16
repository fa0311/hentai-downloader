import { Command } from "@commander-js/extra-typings";
import { socksDispatcher } from "fetch-socks";
import path from "node:path";
import { Readable } from "node:stream";
import { createSafeRequest, getHitomiMangaList } from "./download";
import { downloadHitomiGalleries } from "./hitomi/gallery";
import { parseHitomiUrl } from "./hitomi/url";
import { outputDir, outputZip } from "./utils/dir";
import { parseEnv } from "./utils/env";
import { getChromeHeader } from "./utils/header";
import { galleryInfoToComicInfo } from "./utils/metadata";

const env = await parseEnv();
if (env.SOCKS_HOST !== undefined && env.SOCKS_PORT !== undefined) {
	const dispatcher = socksDispatcher({
		type: env.SOCKS_TYPE,
		host: env.SOCKS_HOST,
		port: env.SOCKS_PORT,
		userId: env.SOCKS_USER,
		password: env.SOCKS_PASSWORD,
	});
	(globalThis as any)[Symbol.for("undici.globalDispatcher.1")] = dispatcher;
	console.log("Using SOCKS proxy:", `${env.SOCKS_HOST}:${env.SOCKS_PORT}`);
}

const program = new Command()
	.name("Hentai Downloader")
	.description("Hentai toolkit CLI")
	.showHelpAfterError()
	.showSuggestionAfterError();

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

program
	.command("download")
	.description("Download from URL or gallery ID")
	.argument("<url / ID>", "http(s) URL or gallery ID to download")
	.action(async (url) => {
		const additionalHeaders = await getChromeHeader();
		const galleryIds = await parseInput(url, additionalHeaders);
		const safeRequest = await createSafeRequest();
		for (const galleryId of galleryIds) {
			const [galleries, allTasks] = await downloadHitomiGalleries({ galleryId, additionalHeaders });
			const downloadDir = await outputDir(path.join(env.DOWNLOAD_PATH, String(galleries.id)));
			await downloadDir.writeFile(`galleries.json`, JSON.stringify(galleries, null, 2));
			await Promise.all(
				allTasks.map(async (task) => {
					const response = await safeRequest(() => task.callback());
					const readStream = Readable.fromWeb(response.body!);
					await downloadDir.writeStream(task.file.name, readStream);
				}),
			);
		}
	});

program
	.command("cbz")
	.description("Download and create CBZ from URL or gallery ID")
	.argument("<url / ID>", "http(s) URL or gallery ID to download")
	.action(async (url) => {
		const additionalHeaders = await getChromeHeader();
		const galleryIds = await parseInput(url, additionalHeaders);
		const safeRequest = await createSafeRequest();
		for (const galleryId of galleryIds) {
			const [galleries, allTasks] = await downloadHitomiGalleries({ galleryId, additionalHeaders });
			const downloadZip = await outputZip(env.DOWNLOAD_PATH, `${galleries.id}.cbz`);
			downloadZip.writeFile(`galleries.json`, JSON.stringify(galleries, null, 2));
			await Promise.all(
				allTasks.map(async (task) => {
					const response = await safeRequest(() => task.callback());
					const readStream = Readable.fromWeb(response.body!);
					downloadZip.writeStream(task.file.name, readStream);
				}),
			);
			downloadZip.writeFile("ComicInfo.xml", galleryInfoToComicInfo(galleries));
			await downloadZip.finalize();
		}
	});

// program
// 	.command("schedule")
// 	.description("Start scheduled downloading")
// 	.argument("<config>", "Path to schedule config file")
// 	.action(async (configPath) => {
// 		const config = await loadConfig(configPath);

// 		new CronJob(
// 			config.cron,
// 			async () => {
// 				for (const query of config.queries) {
// 					const dirs = await listSubdirNames(env.OUTPUT_TYPE === "cbz" ? env.OUTPUT_PATH : env.DOWNLOAD_PATH);
// 					const dirSet = new Set(dirs);

// 					const isSkipDownload = (galleryId: string) => {
// 						if (dirSet.has(galleryId)) {
// 							return true;
// 						}
// 						return false;
// 					};

// 					if (query.url !== undefined) {
// 						await downloadHitomiFromUrl(query.url, { isSkipDownload });
// 					}
// 					if (query.query !== undefined) {
// 						await downloadHitomiMangaList(query.query, { isSkipDownload });
// 					}
// 				}
// 			},
// 			null, // onComplete
// 			true, // start
// 			env.TZ,
// 		);

// 		for (const query of config.queries) {
// 			const dirs = await listSubdirNames(env.OUTPUT_TYPE === "cbz" ? env.OUTPUT_PATH : env.DOWNLOAD_PATH);
// 			const dirSet = new Set(dirs);

// 			const isSkipDownload = (galleryId: string) => {
// 				if (dirSet.has(galleryId)) {
// 					return true;
// 				}
// 				return false;
// 			};

// 			switch (query.type) {
// 				case "url":
// 					await downloadHitomiFromUrl(query.url, { isSkipDownload });
// 					return;
// 				case "query":
// 					await downloadHitomiMangaList(query.query, { isSkipDownload });
// 					return;
// 			}
// 		}
// 	});

try {
	await program.parseAsync(process.argv);
} catch (err) {
	const message = err instanceof Error ? err.message : String(err);
	console.error(message);
	process.exit(1);
}
