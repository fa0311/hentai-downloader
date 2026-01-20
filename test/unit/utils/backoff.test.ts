import { describe, expect, it } from "vitest";
import { counter } from "../../../src/utils/backoff.js";

describe("counter", () => {
	it("starts with default value 0", () => {
		const c = counter();
		expect(c.value()).toBe(0);
	});

	it("starts with custom initial value", () => {
		const c = counter(10);
		expect(c.value()).toBe(10);
	});

	it("increments by 1 each time", () => {
		const c = counter();
		c.increment();
		expect(c.value()).toBe(1);
		c.increment();
		expect(c.value()).toBe(2);
		c.increment();
		expect(c.value()).toBe(3);
	});

	it("increments from custom initial value", () => {
		const c = counter(5);
		c.increment();
		c.increment();
		expect(c.value()).toBe(7);
	});

	it("maintains independent state for multiple counters", () => {
		const c1 = counter();
		const c2 = counter();
		c1.increment();
		c1.increment();
		c2.increment();
		expect(c1.value()).toBe(2);
		expect(c2.value()).toBe(1);
	});

	it("handles negative initial value", () => {
		const c = counter(-5);
		c.increment();
		expect(c.value()).toBe(-4);
	});
});
