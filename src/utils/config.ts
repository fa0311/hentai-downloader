import z from "zod";
import fs from "node:fs/promises";

const configSchema = z.object({
	cron: z.string(),
	queries: z.array(
		z
			.object({
				url: z.string().optional(),
				query: z
					.object({
						artists: z.array(z.string()).optional(),
						series: z.array(z.string()).optional(),
						characters: z.array(z.string()).optional(),
						groups: z.array(z.string()).optional(),
						type: z.string().optional(),
						language: z.string().optional(),
						tags: z.array(z.string()).optional(),
					})
					.refine(
						(data) => {
							return Object.values(data).some((value) => {
								if (Array.isArray(value)) {
									return value.length > 0;
								}
								return value !== undefined;
							});
						},
						{
							message: "At least one query parameter must be specified",
						},
					)
					.optional(),
			})
			.refine(
				(data) => {
					return data.url !== undefined || data.query !== undefined;
				},
				{
					message: "Either 'url' or 'query' must be specified",
				},
			),
	).min(1),
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
