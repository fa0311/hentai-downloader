import fs from "node:fs";
import path from "node:path";
import stream from "node:stream";
import yazl from "yazl";

export const ensureDirExists = async (dirPath: string) => {
	try {
		await fs.promises.access(dirPath);
	} catch {
		await fs.promises.mkdir(dirPath, { recursive: true });
	}
	return dirPath;
};

export type OutputHandler = {
	writeFile: (filename: string, output: string) => void;
	writeStream: (filename: string, readStream: NodeJS.ReadableStream) => void;
};

type OutputCallback = (descriptor: OutputHandler) => Promise<void>;

export const outputDir = async (basePath: string) => {
	await ensureDirExists(basePath);
	const promises: Promise<void>[] = [];

	return async (callback: OutputCallback) => {
		await callback({
			writeFile: (filename: string, output: string) => {
				promises.push(fs.promises.writeFile(path.join(basePath, filename), output, { flush: true }));
			},
			writeStream: (filename: string, readStream: NodeJS.ReadableStream) => {
				const writeStream = fs.createWriteStream(path.join(basePath, filename), { flush: true });
				promises.push(stream.promises.pipeline(readStream, writeStream));
			},
		});
		await Promise.all(promises);
	};
};

export const outputZip = async (filePath: string) => {
	await ensureDirExists(path.dirname(filePath));
	const zip = new yazl.ZipFile();
	const writeStream = fs.createWriteStream(filePath, { flush: true });
	const pipeline = stream.promises.pipeline(zip.outputStream, writeStream);
	return async (callback: OutputCallback) => {
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

		zip.end();
		await pipeline;
	};
};
