import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
	SOCKS_TYPE: z
		.enum(["4", "5"])
		.default("5")
		.transform((v) => Number(v) as 4 | 5),
	SOCKS_HOST: z.string().optional(),
	SOCKS_PORT: z
		.string()
		.default("1080")
		.transform((v) => Number(v)),
	SOCKS_USER: z.string().optional(),
	SOCKS_PASSWORD: z.string().optional(),
	TZ: z.string().default("UTC"),
	OUTPUT_TYPE: z.enum(["directory", "cbz"]).default("directory"),
	SKIP_VIDEO: z
		.enum(["true", "false"])
		.default("false")
		.transform((v) => v === "true"),
	DOWNLOAD_PATH: z.string().default("/downloads"),
	OUTPUT_PATH: z.string().default("/manga"),
	AUTO_CLEAN_DOWNLOAD: z
		.enum(["true", "false"])
		.default("true")
		.transform((v) => v === "true"),
});

export const parseEnv = async () => {
	const env = await envSchema.safeParseAsync(process.env);
	if (env.success) {
		return env.data;
	} else {
		for (const iss of env.error.issues) {
			const path = iss.path?.length ? iss.path.join(".") : "(root)";
			console.error(`[${iss.code}] path=${path} message=${iss.message}`);
		}
		throw new Error("Invalid settings");
	}
};
