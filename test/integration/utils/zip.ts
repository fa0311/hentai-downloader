import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import yauzl from "yauzl";

export const unzip = async (from: string, to: string): Promise<void> => {
	const zip = await new Promise<yauzl.ZipFile>((resolve, reject) => {
		yauzl.open(from, { lazyEntries: true }, (err, zip) => {
			if (err) return reject(err);
			resolve(zip);
		});
	});

	zip.on("entry", async (entry: yauzl.Entry) => {
		const outPath = path.join(to, entry.fileName);
		if (entry.fileName.endsWith("/")) {
			fs.mkdirSync(outPath, { recursive: true });
		} else {
			await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
			await new Promise<void>((resolve, reject) => {
				zip.openReadStream(entry, (err, rs) => {
					if (err) return reject(err);
					pipeline(rs, fs.createWriteStream(outPath)).then(resolve, reject);
				});
			});
		}
		zip.readEntry();
	});

	zip.readEntry();
	await new Promise<void>((resolve) => {
		zip.on("end", resolve);
	});
};
