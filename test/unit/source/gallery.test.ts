import { describe, expect, it } from "vitest";
import { removeNulls, toFormatExt, toFormatType } from "../../../src/source/gallery.js";
import { HentaiParseError } from "../../../src/utils/error.js";

describe("removeNulls", () => {
	it("converts null to undefined", () => {
		const input = { a: null, b: "test" };
		const result = removeNulls(input);
		expect(result.a).toBeUndefined();
		expect(result.b).toBe("test");
	});

	it("keeps undefined as undefined", () => {
		const input = { a: undefined, b: "test" };
		const result = removeNulls(input);
		expect(result.a).toBeUndefined();
		expect(result.b).toBe("test");
	});

	it("keeps other values unchanged", () => {
		const input = { num: 42, str: "hello", bool: true };
		const result = removeNulls(input);
		expect(result).toEqual({ num: 42, str: "hello", bool: true });
	});

	it("handles empty object", () => {
		const input = {};
		const result = removeNulls(input);
		expect(result).toEqual({});
	});

	it("handles multiple nulls", () => {
		const input = { a: null, b: null, c: "value" };
		const result = removeNulls(input);
		expect(result.a).toBeUndefined();
		expect(result.b).toBeUndefined();
		expect(result.c).toBe("value");
	});
});

describe("toFormatType", () => {
	it("prefers avif when available", () => {
		const result = toFormatType({ hasavif: true, haswebp: true });
		expect(result).toBe("avif");
	});

	it("falls back to webp when avif is unavailable", () => {
		const result = toFormatType({ hasavif: false, haswebp: true });
		expect(result).toBe("webp");
	});

	it("throws when no supported image format is available", () => {
		expect(() => toFormatType({ hasavif: false, haswebp: false })).toThrow(HentaiParseError);
		expect(() => toFormatType({ hasavif: false, haswebp: false })).toThrow("No supported image format available");
	});
});

describe("toFormatExt", () => {
	it("returns avif extension", () => {
		expect(toFormatExt("avif")).toBe(".avif");
	});

	it("returns webp extension", () => {
		expect(toFormatExt("webp")).toBe(".webp");
	});
});
