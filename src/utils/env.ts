import "dotenv/config";
import { z } from "zod";
import { HentaiZodParseError } from "../utils/error";

const envSchema = z.object({
	LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("debug"),
	LOG_COLOR: z
		.string()
		.transform((val) => val.toLowerCase() === "true")
		.default(true),
	STATUS_PATH: z.string().optional(),
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
