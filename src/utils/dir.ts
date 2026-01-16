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

export const outputDir = async (basePath: string) => {
	await ensureDirExists(basePath);
	return {
		writeFile: async (filename: string, output: string) => {
			await fs.promises.writeFile(path.join(basePath, filename), output);
		},
		writeStream: async (filename: string, readStream: any) => {
			const writeStream = fs.createWriteStream(path.join(basePath, filename));
			await stream.promises.pipeline(readStream, writeStream);
		},
	};
};

export const outputZip = async (basePath: string, filename: string) => {
	await ensureDirExists(basePath);
	const zip = new yazl.ZipFile();
	const writeStream = fs.createWriteStream(path.join(basePath, filename));
	const pipeline = stream.promises.pipeline(zip.outputStream, writeStream);

	return {
		writeFile: (filename: string, output: string) => {
			zip.addBuffer(Buffer.from(output, "utf-8"), filename, {
				compress: true,
			});
		},
		writeStream: (filename: string, readStream: NodeJS.ReadableStream) => {
			zip.addReadStream(readStream, filename, {
				compress: false,
			});
		},
		finalize: async () => {
			zip.end();
			await pipeline;
		},
	};
};
