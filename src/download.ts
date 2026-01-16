import { Semaphore } from "async-mutex";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { downloadHitomiGalleries, type GalleryInfo } from "./hitomi/gallery";
import { downloadHitomiNozomiList, type SearchQuery } from "./hitomi/list";
import { generateComicInfoXml } from "./hitomi/metadata";
import { exponentialBackoff } from "./utils/backoff";
import { intersectAllGallerieIds } from "./utils/bitmap";
import { createCbz } from "./utils/cbz";
import { ensureDirExists } from "./utils/dir";
import { parseEnv } from "./utils/env";
import { getChromeHeader } from "./utils/header";

const env = await parseEnv();

const exportCbz = async (galleries: GalleryInfo, downloadDir: string) => {
	const outputDir = await ensureDirExists(path.join(env.OUTPUT_PATH, String(galleries.id)));

	const xml = generateComicInfoXml(galleries);
	const cbzStream = await createCbz(galleries.files, downloadDir, xml);

	const cbzPath = path.join(outputDir, `${galleries.id}.cbz`);

	await pipeline(cbzStream, createWriteStream(cbzPath));

	if (env.AUTO_CLEAN_DOWNLOAD) {
		await fs.rm(downloadDir, { recursive: true, force: true });
	}

	return galleries.id;
};

export const downloadHitomiManga = async (galleryId: string, skipVideo: boolean) => {
	const additionalHeaders = await getChromeHeader();
	const [galleries, allTasks] = await downloadHitomiGalleries({ galleryId, additionalHeaders });

	const downloadDir = await ensureDirExists(path.join(env.DOWNLOAD_PATH, String(galleries.id)));

	await fs.writeFile(`${downloadDir}/galleries.json`, JSON.stringify(galleries, null, 2));

	const semaphore = new Semaphore(5);

	const backoff = exponentialBackoff({ baseDelayMs: 500, maxRetries: 10 });

	console.time("download");

	const task = skipVideo ? allTasks.filter((t) => t.type !== "video") : allTasks;
	await Promise.all(
		task.map(async (task) => {
			const release = await semaphore.runExclusive(async () => {
				return backoff(async () => task.callback());
			});
			const arrayBuffer = await release.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			await fs.writeFile(path.join(downloadDir, task.file.name), buffer);
		}),
	);

	console.timeEnd("download");

	if (env.OUTPUT_TYPE === "cbz") {
		return exportCbz(galleries, downloadDir);
	}
	return galleries.id;
};

export type DownloadOptions = {
	isSkipDownload?: (galleryId: string) => boolean;
};

export const downloadHitomiMangaList = async (
	query: SearchQuery,
	{ isSkipDownload = () => false }: DownloadOptions,
) => {
	const semaphore = new Semaphore(5);
	const backoff = exponentialBackoff({ baseDelayMs: 500, maxRetries: 10 });
	const additionalHeaders = await getChromeHeader();

	const tasks = await downloadHitomiNozomiList(query, { additionalHeaders });

	const gallerieIdList = await Promise.all(
		tasks.map(async (task) => {
			const release = await semaphore.runExclusive(async () => {
				return backoff(async () => task());
			});
			const arrayBuffer = await release.arrayBuffer();
			const view = new DataView(arrayBuffer);
			const total = view.byteLength / 4;

			const gallerieIds: number[] = [];
			for (let i = 0; i < total; i++) {
				gallerieIds.push(view.getInt32(i * 4, false));
			}

			return gallerieIds;
		}),
	);

	const mergedGallerieIdList = intersectAllGallerieIds(gallerieIdList);
	const uniqueGallerieIdSet = Array.from(new Set(mergedGallerieIdList));

	for (const galleryId of uniqueGallerieIdSet.map(String)) {
		if (isSkipDownload(galleryId)) {
			console.log(`Skipping gallery ID: ${galleryId}`);
			continue;
		}
		console.log(`Downloading gallery ID: ${galleryId}`);
		await downloadHitomiManga(galleryId, false);
	}
};
