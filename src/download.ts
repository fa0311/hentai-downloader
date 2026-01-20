import path from "node:path";
import { Semaphore } from "async-mutex";
import type { DownloadFileInfo, GalleryInfo } from "./hitomi/gallery.js";
import { downloadHitomiNozomiList, extractNozomiGalleryIds, type SearchQuery } from "./hitomi/list.js";
import { exponentialBackoff } from "./utils/backoff.js";
import { intersectUint32Collections } from "./utils/bitmap.js";
import { HentaiHttpError } from "./utils/error.js";

type NonNullBodyResponse = Response & { body: NonNullable<Response["body"]> };

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
				if (response.body) {
					return { type: "success", value: response as NonNullBodyResponse };
				}
				throw new HentaiHttpError(`Response has no body`);
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
		.replaceAll("{id}", String(gallery.id))
		.replaceAll("{title}", gallery.title)
		.replaceAll("{type}", gallery.type)
		.replaceAll("{language}", String(gallery.language))
		.replaceAll("{year}", String(date.getFullYear()).padStart(4, "0"))
		.replaceAll("{month}", String(date.getMonth() + 1).padStart(2, "0"))
		.replaceAll("{day}", String(date.getDate()).padStart(2, "0"))
		.replaceAll("{now_year}", String(new Date().getFullYear()).padStart(4, "0"))
		.replaceAll("{now_month}", String(new Date().getMonth() + 1).padStart(2, "0"))
		.replaceAll("{now_day}", String(new Date().getDate()).padStart(2, "0"))
		.replaceAll("{now_hour}", String(new Date().getHours()).padStart(2, "0"))
		.replaceAll("{now_minute}", String(new Date().getMinutes()).padStart(2, "0"))
		.replaceAll("{now_second}", String(new Date().getSeconds()).padStart(2, "0"))
		.replaceAll("{random}", String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0"));
};

export const fillFilenamePlaceholders = (template: string, index: number, all: number, filename: DownloadFileInfo["file"]) => {
	const ext = path.extname(filename.name);
	const base = path.basename(filename.name, ext);
	const no = String(index + 1).padStart(String(all).length, "0");

	return template
		.replaceAll("{index}", String(index))
		.replaceAll("{no}", no)
		.replaceAll("{name}", base)
		.replaceAll("{ext}", ext)
		.replaceAll("{height}", "height" in filename ? String(filename.height) : "unknown")
		.replaceAll("{width}", "width" in filename ? String(filename.width) : "unknown")
		.replaceAll("{hash}", "hash" in filename ? filename.hash : "unknown");
};

export const isZipFile = (filename: string) => {
	return filename.toLowerCase().endsWith(".zip") || filename.toLowerCase().endsWith(".cbz");
};
