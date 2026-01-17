import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
	PROXY_TYPE: z
		.enum(["4", "5"])
		.default("5")
		.transform((v) => Number(v) as 4 | 5),
	PROXY_HOST: z.string().optional(),
	PROXY_PORT: z
		.string()
		.default("1080")
		.transform((v) => Number(v)),
	PROXY_USER: z.string().optional(),
	PROXY_PASSWORD: z.string().optional(),
	TZ: z.string().default("UTC"),
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
