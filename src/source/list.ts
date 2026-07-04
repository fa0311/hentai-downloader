export type SearchQuery = {
	discriminator: "search";
	artists: string[];
	series: string[];
	characters: string[];
	groups: string[];
	type?: string;
	language: string;
	tags: string[];
	hostname: string;
};

export type GalleryQuery = {
	discriminator: "gallery";
	galleryId: number;
	hostname: string;
};

export const getListUrls = ({ artists, series, characters, groups, type, language, tags, hostname }: SearchQuery): string[] => {
	const urls: string[] = [];

	const languageQuery = `-${language}.nozomi`;
	for (const artist of artists) {
		urls.push(`https://${hostname}/artist/${encodeURIComponent(artist)}${languageQuery}`);
	}

	for (const group of groups) {
		urls.push(`https://${hostname}/group/${encodeURIComponent(group)}${languageQuery}`);
	}

	for (const _series of series) {
		urls.push(`https://${hostname}/series/${encodeURIComponent(_series)}${languageQuery}`);
	}

	for (const character of characters) {
		urls.push(`https://${hostname}/character/${encodeURIComponent(character)}${languageQuery}`);
	}

	if (type) {
		urls.push(`https://${hostname}/type/${encodeURIComponent(type)}${languageQuery}`);
	}

	for (const tag of tags) {
		urls.push(`https://${hostname}/tag/${encodeURIComponent(tag)}${languageQuery}`);
	}

	if (urls.length === 0) {
		urls.push(`https://${hostname}/index-${encodeURIComponent(language)}.nozomi`);
	}

	return Array.from(new Set(urls));
};

type DownloadGalleryIdListsParam = {
	query: SearchQuery;
	additionalHeaders?: Record<string, string>;
};

export const downloadGalleryIdLists = async ({ query, additionalHeaders }: DownloadGalleryIdListsParam) => {
	const listUrls = getListUrls(query);

	const tasks = listUrls.map((url) => {
		return async () => {
			const response = await fetch(url, {
				headers: {
					...additionalHeaders,
					"accept-language": "ja-JP,ja;q=0.9",
					"cache-control": "no-cache",
					pragma: "no-cache",
				},
			});
			return response;
		};
	});

	return tasks;
};

export const extractGalleryIds = (arrayBuffer: ArrayBuffer): number[] => {
	const view = new DataView(arrayBuffer);
	const entries = view.byteLength / 4;
	return Array.from({ length: entries }, (_, index) => view.getInt32(index * 4, false));
};
