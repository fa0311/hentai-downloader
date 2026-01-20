import { describe, expect, it } from "vitest";
import { fitSymbol, fitText } from "../../../src/utils/log.js";

describe("fitText", () => {
	it("short text with padding", () => {
		const result = fitText("abc", 10);
		expect(result).toBe("abc       ");
		expect(result.length).toBe(10);
	});

	it("exact width text", () => {
		const result = fitText("hello", 5);
		expect(result).toBe("hello");
		expect(result.length).toBe(5);
	});

	it("long text gets truncated", () => {
		const result = fitText("this is a very long text", 10);
		expect(result.length).toBe(10);
	});

	it("empty string", () => {
		const result = fitText("", 5);
		expect(result).toBe("     ");
		expect(result.length).toBe(5);
	});

	it("zero width", () => {
		const result = fitText("test", 0);
		expect(result.length).toBe(0);
	});
});

describe("fitSymbol", () => {
	it("simple ascii", () => {
		const result = fitSymbol("x");
		expect(result).toBe("x ");
		expect(result.length).toBe(2);
	});

	it("returns string with consistent behavior", () => {
		const result = fitSymbol("✓");
		// Ensure it returns a string with some content
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});
});
