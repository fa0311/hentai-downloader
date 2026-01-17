import path from "node:path";
import { Semaphore } from "async-mutex";
import { HentaiHttpError } from "./hitomi/error";
import type { DownloadFileInfo, GalleryInfo } from "./hitomi/gallery";
import { downloadHitomiNozomiList, extractNozomiGalleryIds, type SearchQuery } from "./hitomi/list";
import { exponentialBackoff } from "./utils/backoff";
import { intersectUint32Collections } from "./utils/bitmap";

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
		.replace("{day}", String(date.getDate()).padStart(2, "0"));
};

export const fillFilenamePlaceholders = (
	template: string,
	index: number,
	all: number,
	filename: DownloadFileInfo["file"],
) => {
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
