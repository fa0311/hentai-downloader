import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { runCommand } from "@oclif/test";
import { afterEach, describe, expect, it } from "vitest";
import yauzl from "yauzl";

const unzipAndValidate = async (from: string, to: string) => {
	await fs.promises.mkdir(to, { recursive: true });

	const zipfile = await new Promise<yauzl.ZipFile>((resolve, reject) => {
		yauzl.open(from, { lazyEntries: true }, (err, zf) => (err ? reject(err) : resolve(zf)));
	});

	const entries: string[] = [];

	for (;;) {
		const entry = await new Promise<yauzl.Entry | null>((resolve, reject) => {
			const onEntry = (e: yauzl.Entry) => cleanup(() => resolve(e));
			const onEnd = () => cleanup(() => resolve(null));
			const onError = (e: unknown) => cleanup(() => reject(e));
			const cleanup = (fn: () => void) => {
				zipfile.off("entry", onEntry);
				zipfile.off("end", onEnd);
				zipfile.off("error", onError);
				fn();
			};

			zipfile.once("entry", onEntry);
			zipfile.once("end", onEnd);
			zipfile.once("error", onError);
			zipfile.readEntry();
		});

		if (!entry) break;

		if (/\/$/.test(entry.fileName)) {
			await fs.promises.mkdir(path.join(to, entry.fileName), { recursive: true });
			continue;
		}

		entries.push(entry.fileName);

		const outPath = path.join(to, entry.fileName);
		await fs.promises.mkdir(path.dirname(outPath), { recursive: true });

		const rs = await new Promise<NodeJS.ReadableStream>((resolve, reject) => {
			zipfile.openReadStream(entry, (err, stream) => (err ? reject(err) : resolve(stream)));
		});

		await pipeline(rs, fs.createWriteStream(outPath));
	}

	zipfile.close();
	return entries;
};

const createIntegration = () => {
	const cleanup: Array<() => Promise<void>> = [];

	return {
		temp: async () => {
			const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "hentai-downloader-test-"));
			cleanup.push(() => fs.promises.rm(tempDir, { recursive: true, force: true }));
			return {
				path: tempDir,
				join: (...segments: string[]) => path.join(tempDir, ...segments),
				ls: (...segments: string[]) => fs.promises.readdir(path.join(tempDir, ...segments)),
				access: async (...segments: string[]) => {
					const access = fs.promises.access(path.join(tempDir, ...segments));
					return access.then(() => true).catch(() => false);
				},
				hash: async (...segments: string[]) => {
					const filePath = path.join(tempDir, ...segments);
					const fileBuffer = await fs.promises.readFile(filePath);
					return createHash("sha256").update(fileBuffer).digest("hex");
				},
			};
		},
		afterEachCall: async () => {
			const fns = cleanup.splice(0);
			await Promise.allSettled(fns.map((fn) => fn()));
		},
	};
};

describe("download command integration tests", () => {
	const integration = createIntegration();
	afterEach(() => integration.afterEachCall());

	it("download single gallery", async () => {
		const temp = await integration.temp();
		const a = await runCommand(["download", "3287639", temp.join("{id}")]);
		await fs.promises.writeFile(path.join("aaa"), a.stdout);
		expect(await temp.ls(".")).toEqual(["3287639"]);
		expect(await temp.ls("3287639")).toEqual(["1.jpg", "2.jpg", "3.jpg", "4.jpg", "ComicInfo.xml"]);
		expect(await temp.hash("3287639", "1.jpg")).toEqual("d091e4d8111d5a1ed5a437c024661c27b239746ff0f8ba9b27e84fc82aa37880");
		expect(await temp.hash("3287639", "2.jpg")).toEqual("110daeed9dc9e413132e5af785a50ac09b75ca3c19937aaee102179033122d4a");
		expect(await temp.hash("3287639", "3.jpg")).toEqual("d8327836aedbae90117ba2519c4ec2f68179e2619d1cf29f8b5415e0130c0c9b");
		expect(await temp.hash("3287639", "4.jpg")).toEqual("2d8d44d11a94183a975b5e614acf32dde1f1b265f6ec9ce090d73d6eae70fbd3");
		expect(await temp.hash("3287639", "ComicInfo.xml")).toEqual("f28ffd3f6c99531120ff51112c845687b83b337bbdf6aa491b49fc321924584a");
	});

	it("download and zip single gallery", async () => {
		const temp = await integration.temp();
		const _ = await runCommand(["download", "3287639", temp.join("{id}.zip")]);
		expect(await temp.ls(".")).toEqual(["3287639.zip"]);
		expect(await temp.hash("3287639.zip")).toEqual("bcd7757b07474ad3559b2538762117c4434a169bc8da5d01879b5c6e2fc49e12");
	});
});
