import { Command } from "@commander-js/extra-typings";
import { socksDispatcher } from "fetch-socks";
import { type DownloadOptions, downloadHitomiManga, downloadHitomiMangaList } from "./download";
import { parseHitomiUrl } from "./hitomi/url";
import { loadConfig } from "./utils/config";
import { listSubdirNames } from "./utils/dir";
import { parseEnv } from "./utils/env";

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

const downloadHitomiFromUrl = async (url: string, downloadOptions: DownloadOptions) => {
	const query = parseHitomiUrl(url);
	if (typeof query === "string") {
		await downloadHitomiManga(query);
		return;
	} else {
		await downloadHitomiMangaList(query, downloadOptions);
	}
};

const program = new Command()
	.name("Hentai Downloader")
	.description("Hentai toolkit CLI")
	.showHelpAfterError()
	.showSuggestionAfterError();

program
	.command("download")
	.description("Download from URL or gallery ID")
	.argument("<url / ID>", "http(s) URL or gallery ID to download")
	.action(async (url) => {
		const isGalleryId = /^\d+$/.test(url);
		if (isGalleryId) {
			await downloadHitomiManga(url);
		} else {
			await downloadHitomiFromUrl(url, {});
		}
	});

program
	.command("schedule")
	.description("Start scheduled downloading")
	.argument("<config>", "Path to schedule config file")
	.action(async (configPath) => {
		const config = await loadConfig(configPath);

		// new CronJob(
		// 	config.cron,
		// 	async () => {
		// 		for (const query of config.queries) {
		// 			const dirs = await listSubdirNames(env.OUTPUT_TYPE === "cbz" ? env.OUTPUT_PATH : env.DOWNLOAD_PATH);
		// 			const dirSet = new Set(dirs);

		// 			const isSkipDownload = (galleryId: string) => {
		// 				if (dirSet.has(galleryId)) {
		// 					return true;
		// 				}
		// 				return false;
		// 			};

		// 			if (query.url !== undefined) {
		// 				await downloadHitomiFromUrl(query.url, { isSkipDownload });
		// 			}
		// 			if (query.query !== undefined) {
		// 				await downloadHitomiMangaList(query.query, { isSkipDownload });
		// 			}
		// 		}
		// 	},
		// 	null, // onComplete
		// 	true, // start
		// 	env.TZ,
		// );

		for (const query of config.queries) {
			const dirs = await listSubdirNames(env.OUTPUT_TYPE === "cbz" ? env.OUTPUT_PATH : env.DOWNLOAD_PATH);
			const dirSet = new Set(dirs);

			const isSkipDownload = (galleryId: string) => {
				if (dirSet.has(galleryId)) {
					return true;
				}
				return false;
			};

			switch (query.type) {
				case "url":
					await downloadHitomiFromUrl(query.url, { isSkipDownload });
					return;
				case "query":
					await downloadHitomiMangaList(query.query, { isSkipDownload });
					return;
			}
		}
	});

try {
	await program.parseAsync(process.argv);
} catch (err) {
	const message = err instanceof Error ? err.message : String(err);
	console.error(message);
	process.exit(1);
}
