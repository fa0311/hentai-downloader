import { describe, expect, it } from "vitest";
import { extractGalleryIds, getListUrls } from "../../../src/source/list";

describe("getListUrls", () => {
	it("generates URL for single artist", () => {
		const urls = getListUrls("content.example.com", {
			discriminator: "search",
			artists: ["creator-a"],
			series: [],
			characters: [],
			groups: [],
			language: "japanese",
			tags: [],
			hostname: "content.example.com",
		});
		expect(urls).toEqual(["https://content.example.com/artist/creator-a-japanese.nozomi"]);
	});

	it("generates URLs for multiple artists", () => {
		const urls = getListUrls("content.example.com", {
			discriminator: "search",
			artists: ["creator-a", "creator-b"],
			series: [],
			characters: [],
			groups: [],
			language: "japanese",
			tags: [],
			hostname: "content.example.com",
		});
		expect(urls).toEqual([
			"https://content.example.com/artist/creator-a-japanese.nozomi",
			"https://content.example.com/artist/creator-b-japanese.nozomi",
		]);
	});

	it("generates index URL when no filters specified", () => {
		const urls = getListUrls("content.example.com", {
			discriminator: "search",
			artists: [],
			series: [],
			characters: [],
			groups: [],
			language: "japanese",
			tags: [],
			hostname: "content.example.com",
		});
		expect(urls).toEqual(["https://content.example.com/index-japanese.nozomi"]);
	});

	it("removes duplicate URLs", () => {
		const urls = getListUrls("content.example.com", {
			discriminator: "search",
			artists: ["creator-b", "creator-b"],
			series: [],
			characters: [],
			groups: [],
			language: "japanese",
			tags: [],
			hostname: "content.example.com",
		});
		expect(urls).toEqual(["https://content.example.com/artist/creator-b-japanese.nozomi"]);
		expect(urls.length).toBe(1);
	});

	it("encodes special characters in names", () => {
		const urls = getListUrls("content.example.com", {
			discriminator: "search",
			artists: ["creator name"],
			series: [],
			characters: [],
			groups: [],
			language: "japanese",
			tags: [],
			hostname: "content.example.com",
		});
		expect(urls).toEqual([`https://content.example.com/artist/${encodeURIComponent("creator name")}-japanese.nozomi`]);
	});
});

describe("extractGalleryIds", () => {
	it("returns empty array for empty buffer", () => {
		const buffer = new ArrayBuffer(0);
		const result = extractGalleryIds(buffer);
		expect(result).toEqual([]);
	});

	it("extracts single Int32 value in big-endian", () => {
		const buffer = new ArrayBuffer(4);
		const view = new DataView(buffer);
		view.setInt32(0, 123, false);
		const result = extractGalleryIds(buffer);
		expect(result).toEqual([123]);
	});

	it("extracts multiple Int32 values", () => {
		const buffer = new ArrayBuffer(12);
		const view = new DataView(buffer);
		view.setInt32(0, 100, false);
		view.setInt32(4, 200, false);
		view.setInt32(8, 300, false);
		const result = extractGalleryIds(buffer);
		expect(result).toEqual([100, 200, 300]);
	});

	it("handles negative Int32 values", () => {
		const buffer = new ArrayBuffer(8);
		const view = new DataView(buffer);
		view.setInt32(0, -123, false);
		view.setInt32(4, -456, false);
		const result = extractGalleryIds(buffer);
		expect(result).toEqual([-123, -456]);
	});

	it("handles non-aligned buffer size", () => {
		const buffer = new ArrayBuffer(7);
		const view = new DataView(buffer);
		view.setInt32(0, 100, false);
		const result = extractGalleryIds(buffer);
		// 7/4 = 1.75 → 切り捨てで1つだけ抽出される
		expect(result).toEqual([100]);
	});
});
