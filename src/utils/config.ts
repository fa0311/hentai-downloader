import fs from "node:fs/promises";
import z from "zod";

const configSchema = z.object({
	cron: z.string(),
	queries: z
		.array(
			z.discriminatedUnion("kind", [
				z.object({
					type: z.literal("url"),
					url: z.string(),
				}),
				z.object({
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
			]),
		)
		.min(1),
});

export const parseEnv = async (config: object) => {
	const env = await configSchema.safeParseAsync(config);
	if (env.success) {
		return env.data;
	} else {
		for (const iss of env.error.issues) {
			const path = iss.path?.length ? iss.path.join(".") : "(root)";
			console.error(`[${iss.code}] path=${path} message=${iss.message}`);
		}
		throw new Error("Invalid config");
	}
};

export const loadConfig = async (path: string) => {
	const configJson = await fs.readFile(path, "utf-8");
	return await parseEnv(JSON.parse(configJson));
};
