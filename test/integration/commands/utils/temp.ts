import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { unzip } from "./zip.js";

export type TempDir = {
	path: string;
	join: (...segments: string[]) => string;
	ls: (...segments: string[]) => Promise<string[]>;
	access: (...segments: string[]) => Promise<boolean>;
	hash: (...segments: string[]) => Promise<string>;
	unzip: (...segments: string[]) => Promise<TempDir>;
};

export const createTemp = async (addCleanup: (fn: () => Promise<void>) => void): Promise<TempDir> => {
	const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "hentai-downloader-test-"));
	addCleanup(() => fs.promises.rm(tempDir, { recursive: true, force: true }));
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
		unzip: async (...segments: string[]) => {
			const from = path.join(tempDir, ...segments);
			const to = await createTemp(addCleanup);
			await fs.promises.mkdir(to.path, { recursive: true });
			await unzip(from, to.path);
			return to;
		},
	};
};
