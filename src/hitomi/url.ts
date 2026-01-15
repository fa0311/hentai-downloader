import zod from "zod";
import { SearchQuery } from "./list";

const urlSchema = zod.url();

const listDir = ["artist", "group", "series", "character", "type", "tag"] as const;
const searchDir = ["search", "index"] as const;
const galleryDir = ["cg", "doujinshi", "manga", "gamecg", "imageset", "anime"] as const;

export const checkHitomiUrl = (url: string) => {
	const parsedUrl = new URL(urlSchema.parse(url));
	if (parsedUrl.hostname !== "hitomi.la") {
		throw new Error("Invalid Hitomi.la URL");
	}

	const isListPath = listDir.some((dir) => parsedUrl.pathname.startsWith(`/${dir}`));
	const isSearchPath = searchDir.some((dir) => parsedUrl.pathname.startsWith(`/${dir}`));
	const isGalleryPath = galleryDir.some((dir) => parsedUrl.pathname.startsWith(`/${dir}`));
	if (!isSearchPath && !isGalleryPath && !isListPath) {
		throw new Error("Invalid Hitomi.la URL path");
	}
	return {
		url: parsedUrl,
		isListPath,
		isSearchPath,
		isGalleryPath,
	};
};

export const getHitomiGalleryIdFromUrl = (url: string): string => {
	const parsedUrl = new URL(urlSchema.parse(url));
	const match = /-(\d+)(?:\.html)?$/.exec(parsedUrl.pathname);
	if (match) {
		return match[1];
	} else {
		throw new Error("Invalid Hitomi.la gallery URL: Unable to extract gallery ID");
	}
};

export const getHitomiListQueryFromUrl = (url: string): SearchQuery => {
	const parsedUrl = new URL(urlSchema.parse(url));

	const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

	const languageMatch = /-([a-zA-Z]+)(?:\.html)?$/.exec(parsedUrl.pathname);
	const language = languageMatch && languageMatch[1] !== "all" ? decodeURIComponent(languageMatch[1]) : undefined;

	const listDirPattern = listDir
		.map(escapeRegExp)
		.sort((a, b) => b.length - a.length)
		.join("|");
	const regex = new RegExp(`^/(?:${listDirPattern})/([^/]+)-[^/]+/?$`);

	const match = regex.exec(parsedUrl.pathname);
	if (!match) {
		throw new Error("Invalid Hitomi.la list URL: Unable to extract list query");
	}

	const listType = match[0].split("/")[1];
	const rawQuery = decodeURIComponent(match[1]);

	const query: SearchQuery = {};

	if(language) {
		query.language = language;
	}

	switch (listType) {
		case "artist":
			query.artists = [rawQuery];
			break;
		case "group":
			query.groups = [rawQuery];
			break;
		case "series":
			query.series = [rawQuery];
			break;
		case "character":
			query.characters = [rawQuery];
			break;
		case "type":
			query.type = rawQuery;
			break;
		case "tag":
			query.tags = [rawQuery];
			break;
		default:
			throw new Error("Unsupported list type in Hitomi.la URL");
	}

	return query;
};

export const getHitomiSearchQueryFromUrl = (url: string): SearchQuery => {
	const parsedUrl = new URL(urlSchema.parse(url));

	if (parsedUrl.pathname.startsWith("/index")) {
		const match = /index-(.+?)\.html$/.exec(parsedUrl.pathname);
		if (match) {
			return {
				language: decodeURIComponent(match[1]),
			};
		} else {
			throw new Error("Invalid Hitomi.la search URL: Unable to extract search query");
		}
	} else if (parsedUrl.pathname.startsWith("/search")) {
		const searchParams = parsedUrl.searchParams;
		const rawQuery = searchParams.keys().next().value;

		if (!rawQuery) {
			throw new Error("Invalid Hitomi.la search URL: No search keywords found");
		}

		const queries = rawQuery.split(/\s+/).map(decodeURIComponent).filter(Boolean);

		const query = {
			artists: [] as string[],
			groups: [] as string[],
			series: [] as string[],
			characters: [] as string[],
			tags: [] as string[],
			language: undefined as string | undefined,
			type: undefined as string | undefined,
		};

		for (const q of queries) {
			const [key, ...rest] = q.split(":");
			const value = rest.join(":").replace(/_/g, " ").trim();
			if (!value) continue;

			switch (key.toLowerCase()) {
				case "artist":
					query.artists.push(value);
					break;
				case "group":
					query.groups.push(value);
					break;
				case "series":
					query.series.push(value);
					break;
				case "character":
					query.characters.push(value);
					break;
				case "tag":
					query.tags.push(value);
					break;
				case "language":
					query.language = value;
					break;
				case "type":
					query.type = value;
					break;
				default:
					break;
			}
		}

		return query;
	} else {
		throw new Error("Invalid Hitomi.la search URL path");
	}
};
