import fs from "node:fs";
import path from "node:path";
import stream from "node:stream";
import yauzl from "yauzl";
import yazl from "yazl";
import { ensureDir } from "./dir.js";
import { HentaiPipelineError } from "./error.js";

export type OutputDirHandler = {
	writeFile: (filename: string, output: string) => void;
	writeStream: (filename: string, readStream: NodeJS.ReadableStream) => void;
	throwIfErrors: () => Promise<void>;
};

export const copyDir = async (input: string) => {
	return {
		read: async (filename: string) => {
			return fs.createReadStream(path.join(input, filename));
		},
		open: async (output: string, callback: (descriptor: OutputDirHandler) => Promise<void>) => {
			const override: string[] = [];
			const errors: Error[] = [];
			const promises: Promise<void>[] = [];

			const throwIfErrors = async () => {
				if (errors.length > 0) {
					throw new AggregateError(errors, "Errors occurred during outputDir operations");
				}
			};
			await callback({
				writeFile: (filename: string, data: string) => {
					const create = async () => {
						await fs.promises.mkdir(path.dirname(path.join(output, filename)), { recursive: true });
						await fs.promises.writeFile(path.join(output, filename), data).catch((e) => {
							errors.push(new HentaiPipelineError(`Failed to write file: ${filename}`, { cause: e }));
						});
					};
					promises.push(create());
					override.push(filename);
				},
				writeStream: (filename: string, readStream: NodeJS.ReadableStream) => {
					const create = async () => {
						const ws = fs.createWriteStream(path.join(output, filename));
						await stream.promises.pipeline(readStream, ws).catch((e) => {
							errors.push(new HentaiPipelineError(`Failed to write stream: ${filename}`, { cause: e }));
						});
					};
					promises.push(create());
					override.push(filename);
				},
				throwIfErrors: throwIfErrors,
			});

			for await (const rel of fs.promises.glob("**/*", { cwd: input })) {
				const from = path.join(input, rel);
				const to = path.join(output, rel);

				if ((await fs.promises.lstat(from)).isDirectory()) {
					await fs.promises.mkdir(to, { recursive: true });
				} else {
					if (!override.includes(rel)) {
						await fs.promises.mkdir(path.dirname(to), { recursive: true });
						await fs.promises.copyFile(from, to);
					}
				}
			}
			await Promise.allSettled(promises);
		},
	};
};

export const copyZip = async (input: string) => {
	return {
		read: async (filename: string) => {
			return await new Promise<stream.Readable>((resolve, reject) => {
				yauzl.open(input, { lazyEntries: true }, (err, zip) => {
					if (err) return reject(err);
					zip.on("entry", async (entry: yauzl.Entry) => {
						if (entry.fileName === filename) {
							zip.openReadStream(entry, async (err, rs) => {
								if (err) return reject(err);
								zip.close();
								const pt = new stream.PassThrough();
								rs.pipe(pt);
								resolve(pt);
							});
						} else {
							zip.readEntry();
						}
					});
					zip.on("end", () => {
						reject(new Error(`File ${filename} not found in zip ${input}`));
					});
					zip.readEntry();
				});
			});
		},
		open: async (output: string, callback: (descriptor: OutputDirHandler) => Promise<void>) => {
			const outZip = new yazl.ZipFile();
			const writeStream = fs.createWriteStream(output);
			const pipeline = stream.promises.pipeline(outZip.outputStream, writeStream);
			const override: string[] = [];
			const errors: Error[] = [];
			pipeline.catch((e) => {
				errors.push(new HentaiPipelineError(`Failed to write zip file: ${output}`, { cause: e }));
			});
			const throwIfErrors = async () => {
				if (errors.length > 0) {
					throw new AggregateError(errors, "Errors occurred during outputDir operations");
				}
			};

			await callback({
				writeFile: (filename: string, data: string) => {
					for (const name in ensureDir(path.dirname(filename)).slice(0, -1)) {
						outZip.addEmptyDirectory(`${name}/`);
					}
					outZip.addBuffer(Buffer.from(data), filename, { compress: false });
					override.push(filename);
				},
				writeStream: (filename: string, readStream: NodeJS.ReadableStream) => {
					for (const name in ensureDir(path.dirname(filename)).slice(0, -1)) {
						outZip.addEmptyDirectory(`${name}/`);
					}
					outZip.addReadStream(readStream, filename, { compress: false });
					override.push(filename);
				},
				throwIfErrors: throwIfErrors,
			});

			try {
				await new Promise<void>((resolve, reject) => {
					yauzl.open(input, { lazyEntries: true }, (err, zip) => {
						if (err) return reject(err);
						zip.on("entry", async (entry: yauzl.Entry) => {
							if (entry.fileName.endsWith("/")) {
								outZip.addEmptyDirectory(entry.fileName);
								zip.readEntry();
							} else {
								if (override.includes(entry.fileName)) {
									zip.readEntry();
								} else {
									zip.openReadStream(entry, (err, rs) => {
										if (err) return reject(err);
										outZip.addReadStream(rs, entry.fileName, { compress: false });
										rs.on("end", () => zip.readEntry());
									});
								}
							}
						});
						zip.on("end", () => resolve());
						zip.readEntry();
					});
				});
				outZip.end();
				await pipeline;
			} finally {
				await throwIfErrors();
			}
		},
	};
};
