import "dotenv/config";
import { z } from "zod";
import { getFromCache } from "./cache.js";

const envSchema = z
	.object({
		SOCKS_TYPE: z.literal(5).optional(),
		SOCKS_HOST: z.string(),
		SOCKS_PORT: z.string().transform((val) => parseInt(val, 10)),
		SOCKS_USER: z.string().optional(),
		SOCKS_PASSWORD: z.string().optional(),
	})
	.partial();

export const parseEnv = async () => {
	return await getFromCache("env", async () => {
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
	});
};
