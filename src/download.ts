import path from "node:path/posix";
import { Semaphore } from "async-mutex";
import type { DownloadFileInfo, GalleryInfo } from "./source/gallery.js";
import { downloadGalleryIdLists, extractGalleryIds, type SearchQuery } from "./source/list.js";
import { exponentialBackoffFactory, maxDelayChain, runBackoff } from "./utils/backoff.js";
import { intersectUint32Collections } from "./utils/bitmap.js";
import { HentaiHttpError } from "./utils/error.js";
import { result } from "./utils/result.js";

type NonNullBodyResponse = Response & { body: NonNullable<Response["body"]> };

type SafeRequestParam = { signal?: AbortSignal; maxRetries: number };
export const createSafeRequest = async ({ signal, maxRetries }: SafeRequestParam) => {
	const semaphore = new Semaphore(5);
	const backoff = runBackoff({
		delayFactory: exponentialBackoffFactory({ baseDelayMs: 500 }),
		chain: [maxDelayChain(60000)],
		maxRetries,
		signal,
	});

	return (callback: () => Promise<Response>) => {
		return semaphore.runExclusive(async () => {
			return backoff(async () => {
				const response = await result(callback());
				if (response.ok) {
					if (response.value.status === 503) {
						return { type: "error", error: new HentaiHttpError(`Service unavailable (503) for ${response.value.url}`) };
					}
					if (!response.value.ok) {
						throw new HentaiHttpError(`HTTP error: ${response.value.status} ${response.value.statusText} for ${response.value.url}`);
					}
					if (response.value.body) {
						return { type: "success", value: response.value as NonNullBodyResponse };
					}
					throw new HentaiHttpError(`Response has no body for ${response.value.url}`);
				} else {
					return { type: "error", error: response.error };
				}
			});
		});
	};
};

type GetGalleryIds = {
	query: SearchQuery;
	additionalHeaders?: Record<string, string>;
};

export const getGalleryIds = async ({ query, additionalHeaders }: GetGalleryIds) => {
	const safeRequest = await createSafeRequest({ maxRetries: 10 });
	const tasks = await downloadGalleryIdLists({ query, additionalHeaders });
	const gallerieIdList = await Promise.all(
		tasks.map(async (task) => {
			const response = await safeRequest(() => task());
			return extractGalleryIds(await response.arrayBuffer());
		}),
	);
	return intersectUint32Collections(gallerieIdList);
};

export const fillGalleryPlaceholders = (template: string, gallery: GalleryInfo) => {
	const date = gallery.date ?? gallery.datepublished;
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

export const fillFilenamePlaceholders = (template: string, index: number, all: number, ext: string, file: DownloadFileInfo["file"]) => {
	const { name } = path.parse(file.name);
	const no = String(index + 1).padStart(String(all).length, "0");

	return template
		.replaceAll("{index}", String(index))
		.replaceAll("{no}", no)
		.replaceAll("{name}", name)
		.replaceAll("{ext}", ext)
		.replaceAll("{height}", "height" in file ? String(file.height) : "unknown")
		.replaceAll("{width}", "width" in file ? String(file.width) : "unknown")
		.replaceAll("{hash}", "hash" in file ? file.hash : "unknown");
};

export const isZipFile = (filename: string) => {
	return filename.toLowerCase().endsWith(".zip") || filename.toLowerCase().endsWith(".cbz");
};
