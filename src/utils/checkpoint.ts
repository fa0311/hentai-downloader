import fs from "node:fs";
import ndjson from "ndjson";
import z from "zod";
import { pathExists } from "./dir.js";
import { HentaiZodParseError } from "./error.js";

const GallerySchema = z.strictObject({
	galleryId: z.number(),
	hostname: z.string(),
});

export const loadCheckpoint = async (filePath: string) => {
	if (await pathExists(filePath)) {
		const data = fs.createReadStream(filePath, "utf8");
		return await ndjsonParse(data);
	}
};

export const toCheckpoint = (galleryId: number, hostname: string) => {
	return JSON.stringify({ galleryId, hostname });
};

const ndjsonParse = async (stream: NodeJS.ReadableStream): Promise<{ galleryIds: number[]; hostname: string }[]> => {
	const result: { galleryIds: number[]; hostname: string }[] = [];
	for await (const obj of stream.pipe(ndjson.parse())) {
		const parsed = GallerySchema.safeParse(obj);
		if (parsed.success) {
			const find = result.find((item) => item.hostname === parsed.data.hostname);
			if (find) {
				find.galleryIds.push(parsed.data.galleryId);
			} else {
				result.push({
					galleryIds: [parsed.data.galleryId],
					hostname: parsed.data.hostname,
				});
			}
		} else {
			throw new HentaiZodParseError("Failed to parse ndjson", parsed.error);
		}
	}
	return result;
};
