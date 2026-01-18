import { Args, Command, Flags } from "@oclif/core";
import "dotenv/config";
import { Readable } from "node:stream";
import { CronJob } from "cron";
import { createSafeRequest, fillFilenamePlaceholders, fillGalleryPlaceholders, getHitomiMangaList, isZipFile } from "./../download";
import { downloadHitomiGalleries } from "./../hitomi/gallery";
import { parseHitomiUrl } from "./../hitomi/url";
import { galleryInfoToComicInfo } from "./../utils/comicInfo";
import { parseConfig } from "../utils/config";
import { outputDir, outputZip } from "./../utils/dir";
import { parseEnv } from "../utils/env";
import { getChromeHeader } from "./../utils/header";
import { initProxy } from "./../utils/proxy";
import "dotenv/config";

import pino from "pino";
import { differenceUint32Collections } from "../utils/bitmap";
import { loadCheckpoint } from "../utils/checkpoint";
import type { Query } from "../utils/config";
import { HentaiAlreadyExistsError } from "../utils/error";
import { outputFile } from "../utils/file";
import { exhaustiveMatchAsync } from "../utils/match";

const parseInputQuery = async (inputQuery: Query) => {
	switch (inputQuery.type) {
		case "id":
			return [inputQuery.id];
		case "url": {
			const query = parseHitomiUrl(inputQuery.url);
			if (typeof query === "number") {
				return [query];
			} else {
				return await getHitomiMangaList({ query });
			}
		}
		case "query":
			return await getHitomiMangaList({ query: inputQuery.query });
	}
};

export class Schedule extends Command {
	static description = "Hentai Downloader Schedule";
	static args = {
		config: Args.file({
			description: "Path to the schedule configuration file",
			default: "schedule.json",
			exists: true,
		}),
	};

	static flags = {
		runOnce: Flags.boolean(),
		help: Flags.help(),
		version: Flags.version(),
	};

	async run() {
		const { args, flags } = await this.parse(Schedule);
		const config = await parseConfig(args.config);
		const env = await parseEnv();
		const logger = pino({
			transport: env.LOG_COLOR ? { target: "pino-pretty" } : undefined,
			level: env.LOG_LEVEL,
			timestamp: pino.stdTimeFunctions.isoTime,
		});
		if (initProxy()) logger.info(`Proxy enabled`);
		const safeRequest = await createSafeRequest();

		const onTick = async () => {
			const start = performance.now();
			logger.info("Starting scheduled download task");
			const additionalHeaders = await getChromeHeader();
			const checkPoints = await loadCheckpoint(config.checkpoint);
			const paesedGalleryIds = (await Promise.all(config.queries.map(async (query) => parseInputQuery(query)))).flat();
			const galleryIds = differenceUint32Collections([paesedGalleryIds, checkPoints]);
			if (checkPoints.length > 0) {
				const diff = paesedGalleryIds.length - galleryIds.length;
				logger.info(`Skipping ${diff} already downloaded galleries via checkpoint`);
			}
			logger.debug(`Downloading galleries: ${JSON.stringify(galleryIds)}`);
			await outputFile(async (checkpointDiscriptor) => {
				const checkpoint = await checkpointDiscriptor.create(config.checkpoint, "a");

				for (const galleryId of galleryIds) {
					const [galleries, allTasks] = await downloadHitomiGalleries({ galleryId, additionalHeaders });
					const tasks = config.videoSkip ? allTasks.filter((task) => task.type !== "video") : allTasks;
					const pathname = fillGalleryPlaceholders(config.output, galleries);
					const fd = isZipFile(pathname) ? await outputZip(pathname) : await outputDir(pathname);
					const fdFactory = exhaustiveMatchAsync({
						error: async () => {
							throw new HentaiAlreadyExistsError(`File or directory already exists: ${pathname}`);
						},
						skip: async () => {
							logger.warn(`Skipping existing file or directory: ${pathname}`);
							return null;
						},
						overwrite: async () => {
							logger.warn(`Overwriting existing file or directory: ${pathname}`);
							await fd.remove();
							return fd;
						},
					});
					const outputDescriptor = fd.exists ? await fdFactory(config.ifExists) : fd;
					await outputDescriptor?.create(async (fd) => {
						if (config.metadata) fd.writeFile(`galleries.json`, JSON.stringify(galleries, null, 2));
						if (config.comicInfo) fd.writeFile(`ComicInfo.xml`, galleryInfoToComicInfo(galleries));
						const promises = tasks.map(async (task, i, all) => {
							const filename = fillFilenamePlaceholders(config.filename, i, all.length, task.file);
							const response = await safeRequest(() => task.callback());
							const readStream = Readable.fromWeb(response.body!);
							fd.writeStream(filename, readStream);
						});
						await Promise.all(promises);
					});
					await checkpoint?.line(String(galleryId));
					logger.debug(`Finished downloading gallery ${galleryId} to ${pathname}`);
				}
			});
			const end = performance.now();
			const duration = end - start;
			const seconds = Math.floor((duration / 1000) % 60);
			const minutes = Math.floor((duration / (1000 * 60)) % 60);
			return logger.info(`Scheduled download task completed in ${minutes}m ${seconds}s`);
		};

		if (flags.runOnce) {
			await onTick();
		} else {
			CronJob.from({
				cronTime: config.cron,
				onTick: onTick,
				start: true,
				timeZone: env.TZ,
				runOnInit: config.runOnInit,
				errorHandler: (error: any) => {
					logger.error(error);
				},
				waitForCompletion: true,
			});
		}
	}
}
