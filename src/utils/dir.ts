import fs from "node:fs";
import path from "node:path";
import stream from "node:stream";
import yazl from "yazl";

export const pathExists = async (targetPath: string) => {
	try {
		await fs.promises.access(targetPath);
		return true;
	} catch {
		return false;
	}
};

export type OutputDirHandler = {
	writeFile: (filename: string, output: string) => void;
	writeStream: (filename: string, readStream: NodeJS.ReadableStream) => void;
};

type OutputCallback = (descriptor: OutputDirHandler) => Promise<void>;

export type OutputDescriptor = {
	exists: boolean;
	remove: () => Promise<void>;
	create: (callback: OutputCallback) => Promise<void>;
};
export const outputDir = async (basePath: string): Promise<OutputDescriptor> => {
	const exists = await pathExists(basePath);

	return {
		exists: exists,
		remove: async () => {
			await fs.promises.rm(basePath, { recursive: true, force: true });
		},
		create: async (callback: OutputCallback) => {
			await fs.promises.mkdir(basePath, { recursive: true });
			const promises: Promise<void>[] = [];
			try {
				await callback({
					writeFile: (filename: string, output: string) => {
						promises.push(fs.promises.writeFile(path.join(basePath, filename), output));
					},
					writeStream: (filename: string, readStream: NodeJS.ReadableStream) => {
						const writeStream = fs.createWriteStream(path.join(basePath, filename));
						promises.push(stream.promises.pipeline(readStream, writeStream));
					},
				});
			} finally {
				await Promise.all(promises);
			}
		},
	};
};

export const outputZip = async (filePath: string): Promise<OutputDescriptor> => {
	const exists = await pathExists(filePath);

	return {
		exists: exists,
		remove: async () => {
			await fs.promises.unlink(filePath);
		},
		create: async (callback: OutputCallback) => {
			await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
			const zip = new yazl.ZipFile();
			const writeStream = fs.createWriteStream(filePath);
			const pipeline = stream.promises.pipeline(zip.outputStream, writeStream);
			try {
				await callback({
					writeFile: (filename: string, output: string) => {
						zip.addBuffer(Buffer.from(output, "utf-8"), filename, {
							compress: false,
						});
					},
					writeStream: (filename: string, readStream: NodeJS.ReadableStream) => {
						zip.addReadStream(readStream, filename, {
							compress: false,
						});
					},
				});
			} finally {
				zip.end();
				await pipeline;
			}
		},
	};
};
