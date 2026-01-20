import { describe, expect, it } from "vitest";
import { extractNozomiGalleryIds, getNozomiUrls } from "../../../src/hitomi/list";

describe("getNozomiUrls", () => {
	it("generates URL for single artist", () => {
		const urls = getNozomiUrls({
			artists: ["kinnotama"],
			series: [],
			characters: [],
			groups: [],
			language: "japanese",
			tags: [],
		});
		expect(urls).toEqual(["https://ltn.gold-usergeneratedcontent.net/artist/kinnotama-japanese.nozomi"]);
	});

	it("generates URLs for multiple artists", () => {
		const urls = getNozomiUrls({
			artists: ["kinnotama", "mignon"],
			series: [],
			characters: [],
			groups: [],
			language: "japanese",
			tags: [],
		});
		expect(urls).toEqual([
			"https://ltn.gold-usergeneratedcontent.net/artist/kinnotama-japanese.nozomi",
			"https://ltn.gold-usergeneratedcontent.net/artist/mignon-japanese.nozomi",
		]);
	});

	it("generates index URL when no filters specified", () => {
		const urls = getNozomiUrls({
			artists: [],
			series: [],
			characters: [],
			groups: [],
			language: "japanese",
			tags: [],
		});
		expect(urls).toEqual(["https://ltn.gold-usergeneratedcontent.net/index-japanese.nozomi"]);
	});

	it("removes duplicate URLs", () => {
		const urls = getNozomiUrls({
			artists: ["mignon", "mignon"],
			series: [],
			characters: [],
			groups: [],
			language: "japanese",
			tags: [],
		});
		expect(urls).toEqual(["https://ltn.gold-usergeneratedcontent.net/artist/mignon-japanese.nozomi"]);
		expect(urls.length).toBe(1);
	});

	it("encodes special characters in names", () => {
		const urls = getNozomiUrls({
			artists: ["artist name"],
			series: [],
			characters: [],
			groups: [],
			language: "japanese",
			tags: [],
		});
		expect(urls).toEqual([`https://ltn.gold-usergeneratedcontent.net/artist/${encodeURIComponent("artist name")}-japanese.nozomi`]);
	});
});

describe("extractNozomiGalleryIds", () => {
	it("returns empty array for empty buffer", () => {
		const buffer = new ArrayBuffer(0);
		const result = extractNozomiGalleryIds(buffer);
		expect(result).toEqual([]);
	});

	it("extracts single Int32 value in big-endian", () => {
		const buffer = new ArrayBuffer(4);
		const view = new DataView(buffer);
		view.setInt32(0, 123, false);
		const result = extractNozomiGalleryIds(buffer);
		expect(result).toEqual([123]);
	});

	it("extracts multiple Int32 values", () => {
		const buffer = new ArrayBuffer(12);
		const view = new DataView(buffer);
		view.setInt32(0, 100, false);
		view.setInt32(4, 200, false);
		view.setInt32(8, 300, false);
		const result = extractNozomiGalleryIds(buffer);
		expect(result).toEqual([100, 200, 300]);
	});

	it("handles negative Int32 values", () => {
		const buffer = new ArrayBuffer(8);
		const view = new DataView(buffer);
		view.setInt32(0, -123, false);
		view.setInt32(4, -456, false);
		const result = extractNozomiGalleryIds(buffer);
		expect(result).toEqual([-123, -456]);
	});

	it("handles non-aligned buffer size", () => {
		const buffer = new ArrayBuffer(7);
		const view = new DataView(buffer);
		view.setInt32(0, 100, false);
		const result = extractNozomiGalleryIds(buffer);
		// 7/4 = 1.75 → 切り捨てで1つだけ抽出される
		expect(result).toEqual([100]);
	});
});
