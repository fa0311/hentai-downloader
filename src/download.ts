import { Semaphore } from "async-mutex";
import { HentaiHttpError } from "./hitomi/error";
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
