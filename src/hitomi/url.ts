import { z } from "zod";
import type { SearchQuery } from "./list";

const urlSchema = z.url();

const galleryDirList = ["cg", "doujinshi", "manga", "gamecg", "imageset", "anime"] as const;
const listDirList = ["artist", "group", "series", "character", "type", "tag"] as const;

export const parseHitomiUrl = (url: string): SearchQuery | number => {
	const parsedUrl = new URL(urlSchema.parse(url));
	const galleryDir = galleryDirList.join("|");
	const listDir = listDirList.join("|");

	const galleryPattern = new URLPattern({
		protocol: "https:",
		hostname: "hitomi.la",
		pathname: `/:type(${galleryDir})/:any-:id([0-9]+).html`,
	});

	const listPattern = new URLPattern({
		protocol: "https:",
		hostname: "hitomi.la",
		pathname: `/:type(${listDir})/:name-:language([a-zA-Z]+).html`,
	});

	const indexPattern = new URLPattern({
		protocol: "https:",
		hostname: "hitomi.la",
		pathname: `/index-:language([a-zA-Z]+).html`,
	});

	const searchPattern = new URLPattern({
		protocol: "https:",
		hostname: "hitomi.la",
		pathname: "/search.html",
	});

	const galleryMatch = galleryPattern.exec(parsedUrl.href);
	if (galleryMatch) {
		return Number(galleryMatch.pathname.groups.id!);
	}
	const listMatch = listPattern.exec(parsedUrl.href);
	if (listMatch) {
		const query = (() => {
			const name = decodeURIComponent(listMatch.pathname.groups.name!);
			switch (listMatch.pathname.groups.type!) {
				case "artist":
					return { artists: [name] };
				case "group":
					return { groups: [name] };
				case "series":
					return { series: [name] };
				case "character":
					return { characters: [name] };
				case "type":
					return { type: name };
				case "tag":
					return { tags: [name] };
				default:
					throw new Error("Unreachable code");
			}
		})();

		return {
			series: [],
			characters: [],
			groups: [],
			tags: [],
			artists: [],
			language: listMatch.pathname.groups.language!,
			...query,
		};
	}

	const indexMatch = indexPattern.exec(parsedUrl.href);
	if (indexMatch) {
		return {
			series: [],
			characters: [],
			groups: [],
			tags: [],
			artists: [],
			language: indexMatch.pathname.groups.language!,
		};
	}

	const searchMatch = searchPattern.exec(parsedUrl.href);
	if (searchMatch) {
		const searchParams = parsedUrl.searchParams;
		const rawQuery = searchParams.keys().next().value;

		if (!rawQuery) {
			throw new Error("Invalid Hitomi.la search URL: No search keywords found");
		}

		const queries = decodeURIComponent(rawQuery)
			.split(" ")
			.map((e) => e.trim())
			.filter(Boolean);

		const args = queries.map((q) => {
			if (!q.includes(":")) {
				throw new Error("Unsupported Hitomi.la search URL: Free text search is not supported");
			}
			const [key, ...rest] = q.split(":");
			const value = rest.join(":");
			return [key.toLowerCase(), value];
		});

		return {
			artists: args.filter(([k]) => k === "artist").map(([, v]) => v),
			groups: args.filter(([k]) => k === "group").map(([, v]) => v),
			series: args.filter(([k]) => k === "series").map(([, v]) => v),
			characters: args.filter(([k]) => k === "character").map(([, v]) => v),
			tags: [
				...args.filter(([k]) => k === "tag").map(([, v]) => v),
				...args.filter(([k]) => ["female", "male"].includes(k)).map(([k, v]) => `${k}:${v}`),
			],
			language: args.find(([k]) => k === "language")?.[1] ?? "all",
			type: args.find(([k]) => k === "type")?.[1],
		};
	}

	throw new Error("Invalid Hitomi.la URL");
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
