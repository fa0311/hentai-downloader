import type { z } from "zod";

export class HentaiError extends Error {}

export class HentaiParseError extends HentaiError {}
export class HentaiZodParseError<T> extends HentaiParseError {
	constructor(message: string, error: z.ZodError<T>) {
		const text = error.issues.map((iss) => ` * [${iss.code}]  ${iss.message} at ${iss.path.join(".")}`).join("\n");
		super(`${message}:\n${text}`);
	}
}

export class HentaiHttpError extends HentaiError {}
export class HentaiAlreadyExistsError extends HentaiError {}
