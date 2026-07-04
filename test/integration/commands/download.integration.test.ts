import { runCommand } from "@oclif/test";
import { afterEach, describe, expect, it } from "vitest";
import { parseEnv } from "./utils/env.js";
import { createIntegration } from "./utils/integration.js";
import { parse } from "./utils/parse.js";

describe("download command integration tests", async () => {
	const integration = createIntegration();
	afterEach(integration.afterEachCall);
	const env = await parseEnv();

	it("download single gallery", async () => {
		const temp = await integration.temp();
		const log = await runCommand(["download", env.INPUT, temp.join("{id}")]);
		const parsed = parse(env.INPUT).toString();
		expect(log.stdout).toContain("🚀 Hentai Downloader");
		expect(await temp.ls(".")).toEqual([parsed]);
		expect(await temp.ls(parsed)).toEqual(["1.avif", "2.avif", "3.avif", "4.avif", "ComicInfo.xml"]);
		expect(await temp.hash(parsed, "1.avif")).toEqual("f0ffb5bbf010e7d57a6ae1f52c13e6882da8443473bb509be6f6ec744526edb3");
		expect(await temp.hash(parsed, "2.avif")).toEqual("3644cb2fe85d3f91bdd4d7afd59c930b022ee2aa7552af94d72f7f6645b04b03");
		expect(await temp.hash(parsed, "3.avif")).toEqual("d00749ff372c0c82f595b33c1494c7d33a3cb119ab5afd3737e7c1a46b5027e4");
		expect(await temp.hash(parsed, "4.avif")).toEqual("e9a2115638eff656f9eb6cdb9ae5a9ede97f2ae4163870dea432d2660972a951");
		expect(await temp.hash(parsed, "ComicInfo.xml")).toEqual("179014df3e94620af6e5e34ea4dc32b0106927eb509a6e8c64df525f3f13bc0a");
	});

	it("download and zip single gallery", async () => {
		const temp = await integration.temp();
		const log = await runCommand(["download", env.INPUT, temp.join("{id}.zip")]);
		const parsed = parse(env.INPUT).toString();
		expect(log.stdout).toContain("🚀 Hentai Downloader");
		expect(await temp.ls(".")).toEqual([`${parsed}.zip`]);
		const unzip = await temp.unzip(`${parsed}.zip`);
		expect(await unzip.ls(".")).toEqual(["1.avif", "2.avif", "3.avif", "4.avif", "ComicInfo.xml"]);
		expect(await unzip.hash("1.avif")).toEqual("f0ffb5bbf010e7d57a6ae1f52c13e6882da8443473bb509be6f6ec744526edb3");
		expect(await unzip.hash("2.avif")).toEqual("3644cb2fe85d3f91bdd4d7afd59c930b022ee2aa7552af94d72f7f6645b04b03");
		expect(await unzip.hash("3.avif")).toEqual("d00749ff372c0c82f595b33c1494c7d33a3cb119ab5afd3737e7c1a46b5027e4");
		expect(await unzip.hash("4.avif")).toEqual("e9a2115638eff656f9eb6cdb9ae5a9ede97f2ae4163870dea432d2660972a951");
		expect(await unzip.hash("ComicInfo.xml")).toEqual("179014df3e94620af6e5e34ea4dc32b0106927eb509a6e8c64df525f3f13bc0a");
	});
});
