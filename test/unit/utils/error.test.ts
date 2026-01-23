import { describe, expect, it } from "vitest";
import { z } from "zod";
import { HentaiZodParseError, unreachable } from "../../../src/utils/error.js";

describe("unreachable", () => {
	it("throws HentaiUnreachableError with message", () => {
		expect(() => unreachable()).toThrow("Unreachable code");
	});
});

describe("HentaiZodParseError", () => {
	it("includes custom message in error", () => {
		const schema = z.string();
		const result = schema.safeParse(123);
		expect(result.success).toBe(false);
		if (!result.success) {
			const error = new HentaiZodParseError("Validation failed", result.error);
			expect(error.message).toContain("Validation failed");
			expect(error).toBeInstanceOf(Error);
		}
	});

	it("appends zod error details to custom message", () => {
		const schema = z.number();
		const result = schema.safeParse("text");
		expect(result.success).toBe(false);
		if (!result.success) {
			const error = new HentaiZodParseError("Parse error", result.error);
			expect(error.message.length).toBeGreaterThan("Parse error".length);
		}
	});
});
