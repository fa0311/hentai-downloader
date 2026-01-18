import fs from "node:fs/promises";
import { parse } from "jsonc-parser";
import z from "zod";
import { HentaiZodParseError } from "../utils/error";

const querySchema = z.discriminatedUnion("type", [
	z.strictObject({
		type: z.literal("id"),
		id: z.number(),
	}),
	z.strictObject({
		type: z.literal("url"),
		url: z.string(),
	}),
	z.strictObject({
		type: z.literal("query"),
		query: z.object({
			artists: z.array(z.string()).default([]),
			series: z.array(z.string()).default([]),
			characters: z.array(z.string()).default([]),
			groups: z.array(z.string()).default([]),
			type: z.string().optional(),
			language: z.string().default("all"),
			tags: z.array(z.string()).default([]),
		}),
	}),
]);

const configSchema = z.strictObject({
	cron: z.string(),
	runOnInit: z.boolean().default(false),
	queries: z.array(querySchema).min(1),
	videoSkip: z.boolean().default(true),
	output: z.string().default("output/{id}"),
	filename: z.string().default("{no}{ext}"),
	metadata: z.boolean().default(false),
	comicInfo: z.boolean().default(true),
	ifExists: z.enum(["skip", "overwrite", "error"]).default("overwrite"),
	checkpoint: z.string().default(".checkpoint"),
});

export type Query = z.infer<typeof querySchema>;
export type Config = z.infer<typeof configSchema>;

export const parseConfig = async (path: string) => {
	const configJson = await fs.readFile(path, "utf-8");
	const parsed = await configSchema.safeParseAsync(parse(configJson));
	if (parsed.success) {
		return parsed.data;
	} else {
		throw new HentaiZodParseError("Failed to parse galleries JSON", parsed.error);
	}
};
