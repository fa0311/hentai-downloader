import { describe, expect, expectTypeOf, it } from "vitest";
import { exhaustiveMatch, exhaustiveMatchAsync } from "../../../src/utils/match.js";

describe("exhaustiveMatch", () => {
	it("executes the correct handler based on input value", () => {
		const matcher = exhaustiveMatch({
			apple: () => "red",
			banana: () => "yellow",
			grape: () => "purple",
		});
		expect(matcher("apple")).toBe("red");
		expect(matcher("banana")).toBe("yellow");
		expect(matcher("grape")).toBe("purple");
	});

	it("enforces exhaustive type checking", () => {
		type Fruit = "apple" | "banana" | "grape";
		const matcher = exhaustiveMatch<Fruit, string>({
			apple: () => "red",
			banana: () => "yellow",
			grape: () => "purple",
		});
		expectTypeOf(matcher).parameter(0).toEqualTypeOf<Fruit>();
		expectTypeOf(matcher).returns.toEqualTypeOf<string>();
	});

	it("infers correct return type", () => {
		const stringMatcher = exhaustiveMatch({
			a: () => "result",
			b: () => "another",
		});
		expectTypeOf(stringMatcher("a")).toEqualTypeOf<string>();
		const numberMatcher = exhaustiveMatch({
			x: () => 42,
			y: () => 100,
		});
		expectTypeOf(numberMatcher("x")).toEqualTypeOf<number>();
	});
});

describe("exhaustiveMatchAsync", () => {
	it("executes the correct async handler based on input value", async () => {
		const matcher = exhaustiveMatchAsync({
			apple: async () => "red",
			banana: async () => "yellow",
			grape: async () => "purple",
		});
		await expect(matcher("apple")).resolves.toBe("red");
		await expect(matcher("banana")).resolves.toBe("yellow");
		await expect(matcher("grape")).resolves.toBe("purple");
	});

	it("enforces exhaustive type checking", () => {
		type Fruit = "apple" | "banana" | "grape";
		const matcher = exhaustiveMatchAsync<Fruit, string>({
			apple: async () => "red",
			banana: async () => "yellow",
			grape: async () => "purple",
		});
		expectTypeOf(matcher).parameter(0).toEqualTypeOf<Fruit>();
		expectTypeOf(matcher).returns.toEqualTypeOf<Promise<string>>();
	});

	it("infers correct return type", () => {
		const stringMatcher = exhaustiveMatchAsync({
			a: async () => "result",
			b: async () => "another",
		});
		expectTypeOf(stringMatcher("a")).toEqualTypeOf<Promise<string>>();
		const numberMatcher = exhaustiveMatchAsync({
			x: async () => 42,
			y: async () => 100,
		});
		expectTypeOf(numberMatcher("x")).toEqualTypeOf<Promise<number>>();
	});
});
