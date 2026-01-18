import "dotenv/config";
import { z } from "zod";
import { HentaiZodParseError } from "../utils/error.js";

const envSchema = z.object({
	LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
	LOG_COLOR: z
		.string()
		.transform((val) => val.toLowerCase() === "true")
		.default(false),
	HEARTBEAT_PATH: z.string().optional(),
	LAST_SUCCESS_PATH: z.string().optional(),
	TZ: z.string().default("UTC"),
});

export const parseEnv = async () => {
	const parsed = await envSchema.safeParseAsync(process.env);
	if (parsed.success) {
		return parsed.data;
	} else {
		throw new HentaiZodParseError("Failed to parse galleries JSON", parsed.error);
	}
};
