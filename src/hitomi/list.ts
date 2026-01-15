export type SearchQuery = {
	artists: string[];
	series: string[];
	characters: string[];
	groups: string[];
	type?: string;
	language: string;
	tags: string[];
};

const domain = "ltn.gold-usergeneratedcontent.net";

export const getNozomiUrls = ({ artists, series, characters, groups, type, language, tags }: SearchQuery): string[] => {
	const urls: string[] = [];

	const languageQuery = `-${language}.nozomi`;
	for (const artist of artists) {
		urls.push(`https://${domain}/artist/${encodeURIComponent(artist)}${languageQuery}`);
	}

	for (const group of groups) {
		urls.push(`https://${domain}/group/${encodeURIComponent(group)}${languageQuery}`);
	}

	for (const _series of series) {
		urls.push(`https://${domain}/series/${encodeURIComponent(_series)}${languageQuery}`);
	}

	for (const character of characters) {
		urls.push(`https://${domain}/character/${encodeURIComponent(character)}${languageQuery}`);
	}

	if (type) {
		urls.push(`https://${domain}/type/${encodeURIComponent(type)}${languageQuery}`);
	}

	for (const tag of tags) {
		urls.push(`https://${domain}/tag/${encodeURIComponent(tag)}${languageQuery}`);
	}

	if (urls.length === 0) {
		urls.push(`https://${domain}/index-${encodeURIComponent(language)}.nozomi`);
	}

	return Array.from(new Set(urls));
};

type DownloadNozomiListParam = {
	additionalHeaders?: Record<string, string>;
};

export const downloadHitomiNozomiList = async (query: SearchQuery, { additionalHeaders }: DownloadNozomiListParam) => {
	const nozomiUrls = getNozomiUrls(query);

	const tasks = nozomiUrls.map((url) => {
		return async () => {
			console.log(`Downloading nozomi list from: ${url}`);
			const response = await fetch(url, {
				headers: {
					...additionalHeaders,
					"accept-language": "ja-JP,ja;q=0.9",
					"cache-control": "no-cache",
					pragma: "no-cache",
				},
			});

			if (!response.ok && response.status !== 206 && response.status !== 200) {
				throw new Error(`Failed to download: ${url} - ${response.status} ${response.statusText}`);
			}
			return response;
		};
	});

	return tasks;
};
