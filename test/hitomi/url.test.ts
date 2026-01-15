import { describe, expect, it } from "vitest";
import { parseHitomiUrl } from "../../src/hitomi/url";

describe("parseHitomiUrl", () => {
	it("gallery url", () => {
		const query = parseHitomiUrl("https://hitomi.la/doujinshi/fanbox-art-collection-vol.1-日本語-301722-1571033.html");
		expect(query).toEqual("1571033");
	});
	it("error url", () => {
		expect(() => parseHitomiUrl("https://example.com/")).toThrow("Invalid");
	});
	it("gallery url", () => {
		const query = parseHitomiUrl("https://hitomi.la/artist/kinnotama-japanese.html");
		expect(query).toEqual({
			artists: ["kinnotama"],
			series: [],
			characters: [],
			groups: [],
			language: "japanese",
			tags: [],
		});
	});
	it("tag url", () => {
		const query = parseHitomiUrl(`https://hitomi.la/tag/${encodeURIComponent("female:big breasts")}-japanese.html`);
		expect(query).toEqual({
			artists: [],
			series: [],
			characters: [],
			groups: [],
			language: "japanese",
			tags: ["female:big breasts"],
		});
	});
	it("index url", () => {
		const query = parseHitomiUrl("https://hitomi.la/index-japanese.html");
		expect(query).toEqual({
			artists: [],
			series: [],
			characters: [],
			groups: [],
			language: "japanese",
			tags: [],
		});
	});
	it("search url", () => {
		const query = parseHitomiUrl(
			`https://hitomi.la/search.html?${encodeURIComponent("artist:mignon")} ${encodeURIComponent("type:doujinshi")}`,
		);
		expect(query).toEqual({
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
