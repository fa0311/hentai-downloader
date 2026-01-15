import { describe, expect, it } from "vitest";
import { getNozomiUrls } from "../../src/hitomi/list";

describe("getNozomiUrls", async () => {
	it("one artists", async () => {
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

	it("multiple artists", async () => {
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

	it("index", async () => {
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
});
