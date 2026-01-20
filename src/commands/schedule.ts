import { Args, Command, Flags } from "@oclif/core";
import "dotenv/config";
import { Readable } from "node:stream";
import { CronJob } from "cron";
import { createSafeRequest, fillFilenamePlaceholders, fillGalleryPlaceholders, getHitomiMangaList, isZipFile } from "./../download.js";
import { downloadHitomiGalleries } from "./../hitomi/gallery.js";
import { parseHitomiUrl } from "./../hitomi/url.js";
import { galleryInfoToComicInfo } from "./../utils/comicInfo.js";
import { parseConfig } from "../utils/config.js";
import { outputDir, outputZip } from "./../utils/dir.js";
import { parseEnv } from "../utils/env.js";
import { getChromeHeader } from "./../utils/header.js";
import { initProxy } from "./../utils/proxy.js";
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import pino from "pino";
import { differenceUint32Collections } from "../utils/bitmap.js";
import { loadCheckpoint } from "../utils/checkpoint.js";
import type { Query } from "../utils/config.js";
import { HentaiAlreadyExistsError } from "../utils/error.js";
import { outputFile } from "../utils/file.js";
import { exhaustiveMatchAsync } from "../utils/match.js";

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

const outputTimestamp = (filename: string, errorHandler: (error: unknown) => void) => {
	(async () => {
		await fs.promises.mkdir(path.dirname(filename), { recursive: true });
		await fs.promises.writeFile(filename, `${Math.floor(Date.now() / 1000)}\n`, "utf8");
	})().catch(errorHandler);
};

export default class Schedule extends Command {
	static description = "Run scheduled downloads based on configuration file";

	static examples = [
		{
			description: "Run scheduled downloads with default config",
			command: "<%= config.bin %> schedule",
		},
		{
			description: "Run scheduled downloads with custom config",
			command: "<%= config.bin %> schedule schedule.json",
		},
		{
			description: "Run once without scheduling (useful for testing)",
			command: "<%= config.bin %> schedule --runOnce",
		},
	];

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
				const checkpoint = config.checkpoint ? await checkpointDiscriptor.create(config.checkpoint, "a") : null;

				for (const galleryId of galleryIds) {
					try {
						logger.info(`Downloading galleries: ${galleryId}`);
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
								return undefined;
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
								const readStream = Readable.fromWeb(response.body);
								fd.writeStream(filename, readStream);
							});
							await Promise.all(promises);
						});
						if (env.LAST_SUCCESS_PATH) {
							outputTimestamp(env.LAST_SUCCESS_PATH, logger.error);
						}
						await checkpoint?.line(String(galleryId));
						logger.debug(`Finished downloading gallery ${galleryId} to ${pathname}`);
					} catch (error) {
						logger.error(error);
					}
				}
			});
			const end = performance.now();
			const duration = end - start;
			const seconds = Math.floor((duration / 1000) % 60);
			const minutes = Math.floor((duration / (1000 * 60)) % 60);
			return logger.info(`Scheduled download task completed in ${minutes}m ${seconds}s`);
		};

		if (env.LAST_SUCCESS_PATH) {
			outputTimestamp(env.LAST_SUCCESS_PATH, logger.error);
		}

		if (env.HEARTBEAT_PATH) {
			const pathname = env.HEARTBEAT_PATH;
			outputTimestamp(pathname, logger.error);
			setInterval(() => outputTimestamp(pathname, logger.error), 60000);
		}

		if (flags.runOnce) {
			await onTick();
		} else {
			CronJob.from({
				cronTime: config.cron,
				onTick: onTick,
				start: true,
				timeZone: env.TZ,
				runOnInit: config.runOnInit,
				errorHandler: (error: unknown) => {
					logger.error(error);
				},
				waitForCompletion: true,
			});
		}
	}
}
