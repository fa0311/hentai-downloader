import { describe, expect, it } from "vitest";
import { parseHitomiUrl } from "../../src/hitomi/url";

describe("parseHitomiUrl", () => {
	describe("gallery URLs", () => {
		it("parses gallery URL and returns ID as number", () => {
			const result = parseHitomiUrl("https://hitomi.la/doujinshi/fanbox-art-collection-vol.1-日本語-301722-1571033.html");
			expect(result).toBe(1571033);
		});

		it("handles URL-encoded characters", () => {
			const result = parseHitomiUrl(
				`https://hitomi.la/doujinshi/${encodeURIComponent("fanbox-art-collection-vol.1-日本語")}-301722-1571033.html`,
			);
			expect(result).toBe(1571033);
		});
	});

	describe("list URLs", () => {
		it("parses group URL", () => {
			const result = parseHitomiUrl("https://hitomi.la/group/mignon works-all.html");
			expect(result).toEqual({
				artists: [],
				series: [],
				characters: [],
				groups: ["mignon works"],
				language: "all",
				tags: [],
			});
		});

		it("parses series URL", () => {
			const result = parseHitomiUrl("https://hitomi.la/series/blue archive-all.html");
			expect(result).toEqual({
				artists: [],
				series: ["blue archive"],
				characters: [],
				groups: [],
				language: "all",
				tags: [],
			});
		});

		it("parses character URL", () => {
			const result = parseHitomiUrl("https://hitomi.la/character/mutsuki asagi-all.html");
			expect(result).toEqual({
				artists: [],
				series: [],
				characters: ["mutsuki asagi"],
				groups: [],
				language: "all",
				tags: [],
			});
		});

		it("parses tag URL with colon", () => {
			const result = parseHitomiUrl("https://hitomi.la/tag/female:mesugaki-all.html");
			expect(result).toEqual({
				artists: [],
				series: [],
				characters: [],
				groups: [],
				language: "all",
				tags: ["female:mesugaki"],
			});
		});

		it("parses artist URL", () => {
			const result = parseHitomiUrl("https://hitomi.la/artist/kinnotama-japanese.html");
			expect(result).toEqual({
				artists: ["kinnotama"],
				series: [],
				characters: [],
				groups: [],
				language: "japanese",
				tags: [],
			});
		});
	});

	describe("index URLs", () => {
		it("parses index URL", () => {
			const result = parseHitomiUrl("https://hitomi.la/index-japanese.html");
			expect(result).toEqual({
				artists: [],
				series: [],
				characters: [],
				groups: [],
				language: "japanese",
				tags: [],
			});
		});
	});

	describe("search URLs", () => {
		it("parses search URL with multiple parameters", () => {
			const result = parseHitomiUrl(
				`https://hitomi.la/search.html?${encodeURIComponent("artist:mignon")} ${encodeURIComponent("type:doujinshi")}`,
			);
			expect(result).toEqual({
				artists: ["mignon"],
				series: [],
				characters: [],
				groups: [],
				language: "all",
				tags: [],
				type: "doujinshi",
			});
		});
	});

	describe("root URLs", () => {
		it("parses root URL", () => {
			const result = parseHitomiUrl("https://hitomi.la/");
			expect(result).toEqual({
				artists: [],
				groups: [],
				series: [],
				characters: [],
				tags: [],
				language: "all",
				type: undefined,
			});
		});

		it("parses root URL with query parameters", () => {
			const result = parseHitomiUrl("https://hitomi.la/?page=2");
			expect(result).toEqual({
				artists: [],
				groups: [],
				series: [],
				characters: [],
				tags: [],
				language: "all",
				type: undefined,
			});
		});
	});

	describe("error cases", () => {
		it("throws error for non-hitomi.la URL", () => {
			expect(() => parseHitomiUrl("https://example.com/")).toThrow("Invalid");
		});

		it("throws error for invalid URL format", () => {
			expect(() => parseHitomiUrl("not-a-url")).toThrow();
		});

		it("throws error for search URL without query parameters", () => {
			expect(() => parseHitomiUrl("https://hitomi.la/search.html")).toThrow("No search keywords");
		});

		it("throws error for free text search without colon", () => {
			expect(() => parseHitomiUrl("https://hitomi.la/search.html?freetext")).toThrow("Unsupported");
		});
	});
});
