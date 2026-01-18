import path from "node:path";
import { Semaphore } from "async-mutex";
import type { DownloadFileInfo, GalleryInfo } from "./hitomi/gallery.js";
import { downloadHitomiNozomiList, extractNozomiGalleryIds, type SearchQuery } from "./hitomi/list.js";
import { exponentialBackoff } from "./utils/backoff.js";
import { intersectUint32Collections } from "./utils/bitmap.js";
import { HentaiHttpError } from "./utils/error.js";

export const createSafeRequest = async () => {
	const semaphore = new Semaphore(5);
	const backoff = exponentialBackoff({ baseDelayMs: 500, maxRetries: 10 });

	return (callback: () => Promise<Response>) => {
		return semaphore.runExclusive(async () => {
			return backoff(async () => {
				const response = await callback();
				if (response.status === 503) {
					return {
						type: "error",
						error: new HentaiHttpError(`Service unavailable (503)`),
					};
				}
				if (!response.ok) {
					throw new HentaiHttpError(`HTTP error: ${response.status} ${response.statusText}`);
				}
				return { type: "success", value: response };
			});
		});
	};
};

type GetHitomiMangaList = {
	query: SearchQuery;
	additionalHeaders?: Record<string, string>;
};
export const getHitomiMangaList = async ({ query, additionalHeaders }: GetHitomiMangaList) => {
	const safeRequest = await createSafeRequest();
	const tasks = await downloadHitomiNozomiList({ query, additionalHeaders });
	const gallerieIdList = await Promise.all(
		tasks.map(async (task) => {
			const response = await safeRequest(() => task());
			return extractNozomiGalleryIds(await response.arrayBuffer());
		}),
	);
	return intersectUint32Collections(gallerieIdList);
};

export const fillGalleryPlaceholders = (template: string, gallery: GalleryInfo) => {
	const date = new Date(gallery.date ?? gallery.datepublished);
	return template
		.replace("{id}", String(gallery.id))
		.replace("{title}", gallery.title)
		.replace("{type}", gallery.type)
		.replace("{language}", String(gallery.language))
		.replace("{year}", String(date.getFullYear()).padStart(4, "0"))
		.replace("{month}", String(date.getMonth() + 1).padStart(2, "0"))
		.replace("{day}", String(date.getDate()).padStart(2, "0"))
		.replace("{now_year}", String(new Date().getFullYear()).padStart(4, "0"))
		.replace("{now_month}", String(new Date().getMonth() + 1).padStart(2, "0"))
		.replace("{now_day}", String(new Date().getDate()).padStart(2, "0"))
		.replace("{now_hour}", String(new Date().getHours()).padStart(2, "0"))
		.replace("{now_minute}", String(new Date().getMinutes()).padStart(2, "0"))
		.replace("{now_second}", String(new Date().getSeconds()).padStart(2, "0"))
		.replace("{random}", String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0"));
};

export const fillFilenamePlaceholders = (template: string, index: number, all: number, filename: DownloadFileInfo["file"]) => {
	const ext = path.extname(filename.name);
	const base = path.basename(filename.name, ext);
	const no = String(index + 1).padStart(String(all).length, "0");

	return template
		.replace("{index}", String(index))
		.replace("{no}", no)
		.replace("{name}", base)
		.replace("{ext}", ext)
		.replace("{height}", "height" in filename ? String(filename.height) : "unknown")
		.replace("{width}", "width" in filename ? String(filename.width) : "unknown")
		.replace("{hash}", "hash" in filename ? filename.hash : "unknown");
};

export const isZipFile = (filename: string) => {
	return filename.toLowerCase().endsWith(".zip") || filename.toLowerCase().endsWith(".cbz");
};
