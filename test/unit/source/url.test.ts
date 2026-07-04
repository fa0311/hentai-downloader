import { describe, expect, it } from "vitest";
import { parseSourceUrl } from "../../../src/source/url";

describe("parseSourceUrl", () => {
	describe("gallery URLs", () => {
		it("parses gallery URL and returns gallery query", () => {
			const result = parseSourceUrl("https://example.com/manga/sample-gallery-title-日本語-301722-1571033.html");
			expect(result).toEqual({
				discriminator: "gallery",
				galleryId: 1571033,
				hostname: "example.com",
			});
		});

		it("handles URL-encoded characters", () => {
			const result = parseSourceUrl(`https://example.com/manga/${encodeURIComponent("sample-gallery-title-日本語")}-301722-1571033.html`);
			expect(result).toEqual({
				discriminator: "gallery",
				galleryId: 1571033,
				hostname: "example.com",
			});
		});
	});

	describe("list URLs", () => {
		it("parses group URL", () => {
			const result = parseSourceUrl("https://example.com/group/sample group-all.html");
			expect(result).toEqual({
				discriminator: "search",
				artists: [],
				series: [],
				characters: [],
				groups: ["sample group"],
				language: "all",
				tags: [],
				hostname: "example.com",
			});
		});

		it("parses series URL", () => {
			const result = parseSourceUrl("https://example.com/series/sample series-all.html");
			expect(result).toEqual({
				discriminator: "search",
				artists: [],
				series: ["sample series"],
				characters: [],
				groups: [],
				language: "all",
				tags: [],
				hostname: "example.com",
			});
		});

		it("parses character URL", () => {
			const result = parseSourceUrl("https://example.com/character/sample character-all.html");
			expect(result).toEqual({
				discriminator: "search",
				artists: [],
				series: [],
				characters: ["sample character"],
				groups: [],
				language: "all",
				tags: [],
				hostname: "example.com",
			});
		});

		it("parses tag URL with colon", () => {
			const result = parseSourceUrl("https://example.com/tag/female:sample_tag-all.html");
			expect(result).toEqual({
				discriminator: "search",
				artists: [],
				series: [],
				characters: [],
				groups: [],
				language: "all",
				tags: ["female:sample_tag"],
				hostname: "example.com",
			});
		});

		it("parses artist URL", () => {
			const result = parseSourceUrl("https://example.com/artist/sample-creator-japanese.html");
			expect(result).toEqual({
				discriminator: "search",
				artists: ["sample-creator"],
				series: [],
				characters: [],
				groups: [],
				language: "japanese",
				tags: [],
				hostname: "example.com",
			});
		});
	});

	describe("index URLs", () => {
		it("parses index URL", () => {
			const result = parseSourceUrl("https://example.com/index-japanese.html");
			expect(result).toEqual({
				discriminator: "search",
				artists: [],
				series: [],
				characters: [],
				groups: [],
				language: "japanese",
				tags: [],
				hostname: "example.com",
			});
		});
	});

	describe("search URLs", () => {
		it("parses search URL with multiple parameters", () => {
			const result = parseSourceUrl(
				`https://example.com/search.html?${encodeURIComponent("artist:sample-creator")} ${encodeURIComponent("type:manga")}`,
			);
			expect(result).toEqual({
				discriminator: "search",
				artists: ["sample-creator"],
				series: [],
				characters: [],
				groups: [],
				language: "all",
				tags: [],
				type: "manga",
				hostname: "example.com",
			});
		});

		it("parses search with female prefix", () => {
			const result = parseSourceUrl(`https://example.com/search.html?${encodeURIComponent("female:sample_tag")}`);
			expect(result).toEqual({
				discriminator: "search",
				artists: [],
				series: [],
				characters: [],
				groups: [],
				language: "all",
				tags: ["female:sample_tag"],
				type: undefined,
				hostname: "example.com",
			});
		});

		it("parses search with tag and female prefix", () => {
			const result = parseSourceUrl(
				`https://example.com/search.html?${encodeURIComponent("tag:sample_tag_2")} ${encodeURIComponent("female:sample_tag")}`,
			);
			expect(result).toMatchObject({
				tags: ["sample_tag_2", "female:sample_tag"],
			});
		});

		it("parses search with language parameter", () => {
			const result = parseSourceUrl(
				`https://example.com/search.html?${encodeURIComponent("artist:sample-creator")} ${encodeURIComponent("language:japanese")}`,
			);
			expect(result).toMatchObject({
				language: "japanese",
			});
		});

		it("parses search with value containing colon", () => {
			const result = parseSourceUrl(`https://example.com/search.html?${encodeURIComponent("tag:female:sample_tag_2")}`);
			expect(result).toMatchObject({
				tags: ["female:sample_tag_2"],
			});
		});
	});

	describe("root URLs", () => {
		it("parses root URL", () => {
			const result = parseSourceUrl("https://example.com/");
			expect(result).toEqual({
				discriminator: "search",
				artists: [],
				groups: [],
				series: [],
				characters: [],
				tags: [],
				language: "all",
				type: undefined,
				hostname: "example.com",
			});
		});

		it("parses root URL with query parameters", () => {
			const result = parseSourceUrl("https://example.com/?page=2");
			expect(result).toEqual({
				discriminator: "search",
				artists: [],
				groups: [],
				series: [],
				characters: [],
				tags: [],
				language: "all",
				type: undefined,
				hostname: "example.com",
			});
		});
	});

	describe("error cases", () => {
		it("throws error for unsupported URL shape", () => {
			expect(() => parseSourceUrl("https://example.com/unsupported/path")).toThrow("Invalid");
		});

		it("throws error for invalid URL format", () => {
			expect(() => parseSourceUrl("not-a-url")).toThrow();
		});

		it("throws error for search URL without query parameters", () => {
			expect(() => parseSourceUrl("https://example.com/search.html")).toThrow("No search keywords");
		});

		it("throws error for free text search without colon", () => {
			expect(() => parseSourceUrl("https://example.com/search.html?freetext")).toThrow("Unsupported");
		});
	});
});
