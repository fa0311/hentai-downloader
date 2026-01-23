import fs from "node:fs";
import path from "node:path";
import stream from "node:stream";
import yazl from "yazl";
import { HentaiPipelineError } from "./error.js";

export const pathExists = async (targetPath: string) => {
	try {
		await fs.promises.access(targetPath);
		return true;
	} catch {
		return false;
	}
};

export type OutputDirHandler = {
	signal: AbortSignal;
	writeFile: (filename: string, output: string) => void;
	writeStream: (filename: string, readStream: NodeJS.ReadableStream) => void;
	throwIfErrors: () => Promise<void>;
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
			const ac = new AbortController();
			const errors: Error[] = [];
			const throwIfErrors = async () => {
				if (errors.length > 0) {
					throw new AggregateError(errors, "Errors occurred during outputDir operations");
				}
			};

			try {
				try {
					await callback({
						signal: ac.signal,
						writeFile: (filename: string, output: string) => {
							const promise = fs.promises.writeFile(path.join(basePath, filename), output, { signal: ac.signal });
							promise.catch((e) => {
								ac.abort();
								errors.push(new HentaiPipelineError(`Failed to write file: ${filename}`, { cause: e }));
							});
							promises.push(promise);
						},
						writeStream: (filename: string, readStream: NodeJS.ReadableStream) => {
							const writeStream = fs.createWriteStream(path.join(basePath, filename));
							const promise = stream.promises.pipeline(readStream, writeStream, { signal: ac.signal });
							promise.catch((e) => {
								ac.abort();
								errors.push(new HentaiPipelineError(`Failed to write stream to file: ${filename}`, { cause: e }));
							});
							promises.push(promise);
						},
						throwIfErrors: throwIfErrors,
					});
				} finally {
					await Promise.allSettled(promises);
				}
			} finally {
				await throwIfErrors();
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
			const ac = new AbortController();
			const errors: Error[] = [];
			const zip = new yazl.ZipFile();
			const writeStream = fs.createWriteStream(filePath);
			const pipeline = stream.promises.pipeline(zip.outputStream, writeStream);
			pipeline.catch((e) => {
				ac.abort();
				errors.push(new HentaiPipelineError(`Failed to write zip file: ${filePath}`, { cause: e }));
			});
			const throwIfErrors = async () => {
				if (errors.length > 0) {
					throw new AggregateError(errors, "Errors occurred during outputDir operations");
				}
			};
			try {
				try {
					await callback({
						signal: ac.signal,
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
						throwIfErrors: throwIfErrors,
					});
				} finally {
					zip.end();
					await pipeline;
				}
			} finally {
				await throwIfErrors();
			}
		},
	};
};
