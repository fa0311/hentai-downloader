import { z } from "zod";
import { unreachable } from "../utils/error.js";
import type { GalleryQuery, SearchQuery } from "./list.js";

const urlSchema = z.url();

const galleryDirList = ["cg", "doujinshi", "manga", "gamecg", "imageset", "anime"] as const;
const listDirList = ["artist", "group", "series", "character", "type", "tag"] as const;

export const parseSourceUrl = (url: string): SearchQuery | GalleryQuery => {
	const parsedUrl = new URL(urlSchema.parse(url));
	const galleryDir = galleryDirList.join("|");
	const listDir = listDirList.join("|");

	const galleryPattern = new URLPattern({
		protocol: "https:",
		pathname: `/:type(${galleryDir})/:any-:id([0-9]+).html`,
	});

	const listPattern = new URLPattern({
		protocol: "https:",
		pathname: `/:type(${listDir})/:name-:language([a-zA-Z]+).html`,
	});

	const indexPattern = new URLPattern({
		protocol: "https:",
		pathname: `/index-:language([a-zA-Z]+).html`,
	});

	const searchPattern = new URLPattern({
		protocol: "https:",
		pathname: "/search.html",
	});

	const allPattern = new URLPattern({
		protocol: "https:",
		pathname: "/",
	});

	const galleryMatch = galleryPattern.exec(parsedUrl.href);
	if (galleryMatch) {
		return {
			discriminator: "gallery",
			galleryId: Number(galleryMatch.pathname.groups.id),
			hostname: parsedUrl.hostname,
		};
	}
	const listMatch = listPattern.exec(parsedUrl.href);
	if (listMatch) {
		const query = (() => {
			const name = decodeURIComponent(listMatch.pathname.groups.name ?? unreachable());
			switch (listMatch.pathname.groups.type) {
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
			}
		})();

		return {
			discriminator: "search",
			series: [],
			characters: [],
			groups: [],
			tags: [],
			artists: [],
			language: listMatch.pathname.groups.language ?? "all",
			hostname: parsedUrl.hostname,
			...query,
		};
	}

	const indexMatch = indexPattern.exec(parsedUrl.href);
	if (indexMatch) {
		return {
			discriminator: "search",
			series: [],
			characters: [],
			groups: [],
			tags: [],
			artists: [],
			language: indexMatch.pathname.groups.language ?? "all",
			hostname: parsedUrl.hostname,
		};
	}

	const searchMatch = searchPattern.exec(parsedUrl.href);
	if (searchMatch) {
		const searchParams = parsedUrl.searchParams;
		const rawQuery = searchParams.keys().next().value;

		if (!rawQuery) {
			throw new Error("Invalid search URL: No search keywords found");
		}

		const queries = decodeURIComponent(rawQuery)
			.split(" ")
			.map((e) => e.trim())
			.filter(Boolean);

		const args = queries.map((q) => {
			if (!q.includes(":")) {
				throw new Error("Unsupported search URL: Free text search is not supported");
			}
			const [key, ...rest] = q.split(":");
			const value = rest.join(":");
			return [key.toLowerCase(), value];
		});

		return {
			discriminator: "search",
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
			hostname: parsedUrl.hostname,
		};
	}

	const allMatch = allPattern.exec(parsedUrl.href);
	if (allMatch) {
		return {
			discriminator: "search",
			artists: [],
			groups: [],
			series: [],
			characters: [],
			tags: [],
			language: "all",
			type: undefined,
			hostname: parsedUrl.hostname,
		};
	}

	throw new Error("Invalid source URL");
};
