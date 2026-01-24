import { runCommand } from "@oclif/test";
import { afterEach, describe, expect, it } from "vitest";
import { createIntegration } from "./utils/integration.js";

describe("download command integration tests", () => {
	const integration = createIntegration();
	afterEach(integration.afterEachCall);

	it("download single gallery", async () => {
		const temp = await integration.temp();
		const log = await runCommand(["download", "3287639", temp.join("{id}")]);
		expect(log.stdout).toContain("🚀 Hentai Downloader");
		expect(await temp.ls(".")).toEqual(["3287639"]);
		expect(await temp.ls("3287639")).toEqual(["1.jpg", "2.jpg", "3.jpg", "4.jpg", "ComicInfo.xml"]);
		expect(await temp.hash("3287639", "1.jpg")).toEqual("d091e4d8111d5a1ed5a437c024661c27b239746ff0f8ba9b27e84fc82aa37880");
		expect(await temp.hash("3287639", "2.jpg")).toEqual("110daeed9dc9e413132e5af785a50ac09b75ca3c19937aaee102179033122d4a");
		expect(await temp.hash("3287639", "3.jpg")).toEqual("d8327836aedbae90117ba2519c4ec2f68179e2619d1cf29f8b5415e0130c0c9b");
		expect(await temp.hash("3287639", "4.jpg")).toEqual("2d8d44d11a94183a975b5e614acf32dde1f1b265f6ec9ce090d73d6eae70fbd3");
		expect(await temp.hash("3287639", "ComicInfo.xml")).toEqual("b7a59391216587f1209c35a1c29d2ac4211e1a9a61af3335da214e4681bb87dc");
	});

	it("download and zip single gallery", async () => {
		const temp = await integration.temp();
		const log = await runCommand(["download", "3287639", temp.join("{id}.zip")]);
		expect(log.stdout).toContain("🚀 Hentai Downloader");
		expect(await temp.ls(".")).toEqual(["3287639.zip"]);
		const unzip = await temp.unzip("3287639.zip");
		expect(await unzip.ls(".")).toEqual(["1.jpg", "2.jpg", "3.jpg", "4.jpg", "ComicInfo.xml"]);
		expect(await unzip.hash("1.jpg")).toEqual("d091e4d8111d5a1ed5a437c024661c27b239746ff0f8ba9b27e84fc82aa37880");
		expect(await unzip.hash("2.jpg")).toEqual("110daeed9dc9e413132e5af785a50ac09b75ca3c19937aaee102179033122d4a");
		expect(await unzip.hash("3.jpg")).toEqual("d8327836aedbae90117ba2519c4ec2f68179e2619d1cf29f8b5415e0130c0c9b");
		expect(await unzip.hash("4.jpg")).toEqual("2d8d44d11a94183a975b5e614acf32dde1f1b265f6ec9ce090d73d6eae70fbd3");
		expect(await unzip.hash("ComicInfo.xml")).toEqual("b7a59391216587f1209c35a1c29d2ac4211e1a9a61af3335da214e4681bb87dc");
	});
});
