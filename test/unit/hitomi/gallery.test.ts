import { describe, expect, it } from "vitest";
import { removeNulls } from "../../../src/hitomi/gallery.js";

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
