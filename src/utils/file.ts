import fs from "node:fs";
import path from "node:path";

export type OutputFileDescriptor = {
	line: (output: string) => Promise<void>;
	write: (output: string) => Promise<void>;
};
type OutputFileHandler = {
	create: (filePath: string, flags: "a" | "w") => Promise<OutputFileDescriptor>;
};
type OutputCallback = (callback: OutputFileHandler) => Promise<void>;

export const outputFile = async (callback: OutputCallback) => {
	const cleanup: (() => Promise<void>)[] = [];
	try {
		await callback({
			create: async (filePath: string, flags: "a" | "w") => {
				await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
				const writeStream = fs.createWriteStream(filePath, { flags });
				cleanup.push(async () => {
					writeStream.end();
					await new Promise<void>((resolve, reject) => {
						writeStream.once("finish", resolve);
						writeStream.once("error", reject);
					});
				});
				return {
					line: async (output: string) => {
						return new Promise<void>((resolve, reject) => {
							writeStream.write(`${output}\n`, "utf8", (err) => (err ? reject(err) : resolve()));
						});
					},
					write: async (output: string) => {
						return new Promise<void>((resolve, reject) => {
							writeStream.write(output, "utf8", (err) => (err ? reject(err) : resolve()));
						});
					},
				};
			},
		});
	} finally {
		await Promise.all(cleanup.map((fn) => fn));
	}
};
