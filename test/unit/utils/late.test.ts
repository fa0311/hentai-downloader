import { describe, expect, it } from "vitest";
import { createLate } from "../../../src/utils/late.js";

describe("createLate", () => {
	it("throws error before set is called", () => {
		const late = createLate<number>();
		expect(() => late.get()).toThrow("Late value has not been set yet");
	});

	it("returns value after set is called", () => {
		const late = createLate<number>();
		late.set(42);
		expect(late.get()).toBe(42);
	});

	it("can set and get different types", () => {
		const stringLate = createLate<string>();
		stringLate.set("hello");
		expect(stringLate.get()).toBe("hello");

		const objectLate = createLate<{ key: string }>();
		objectLate.set({ key: "value" });
		expect(objectLate.get()).toEqual({ key: "value" });
	});

	it("maintains independent state for multiple instances", () => {
		const late1 = createLate<number>();
		const late2 = createLate<number>();

		late1.set(10);
		late2.set(20);

		expect(late1.get()).toBe(10);
		expect(late2.get()).toBe(20);
	});

	it("allows overwriting value", () => {
		const late = createLate<number>();
		late.set(1);
		late.set(2);
		expect(late.get()).toBe(2);
	});
});
