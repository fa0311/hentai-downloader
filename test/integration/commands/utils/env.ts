import "dotenv/config";
import { z } from "zod";
import { HentaiZodParseError } from "../../../../src/utils/error.js";

const envSchema = z.object({
	INPUT: z.url(),
});

export const parseEnv = async () => {
	const parsed = await envSchema.safeParseAsync(process.env);
	if (parsed.success) {
		return parsed.data;
	} else {
		throw new HentaiZodParseError("Failed to parse galleries JSON", parsed.error);
	}
};
