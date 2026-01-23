import { describe, expect, it } from "vitest";
import { createCompleter } from "../../../src/utils/completer.js";

describe("createCompleter", () => {
	it("resolves promise when resolve is called", async () => {
		const { promise, resolve } = createCompleter<string>();
		resolve("test value");
		await expect(promise).resolves.toBe("test value");
	});

	it("rejects promise when reject is called", async () => {
		const { promise, reject } = createCompleter<string>();
		reject(new Error("test error"));
		await expect(promise).rejects.toThrow("test error");
	});

	it("resolves with different types", async () => {
		const numberCompleter = createCompleter<number>();
		numberCompleter.resolve(42);
		await expect(numberCompleter.promise).resolves.toBe(42);

		const objectCompleter = createCompleter<{ key: string }>();
		objectCompleter.resolve({ key: "value" });
		await expect(objectCompleter.promise).resolves.toEqual({ key: "value" });
	});

	it("creates independent completers", async () => {
		const completer1 = createCompleter<string>();
		const completer2 = createCompleter<string>();

		completer1.resolve("first");
		completer2.resolve("second");

		await expect(completer1.promise).resolves.toBe("first");
		await expect(completer2.promise).resolves.toBe("second");
	});

	it("can reject with any error type", async () => {
		const { promise, reject } = createCompleter<void>();
		reject("string error");
		await expect(promise).rejects.toBe("string error");
	});

	it("resolves with promise-like value", async () => {
		const { promise, resolve } = createCompleter<string>();
		resolve(Promise.resolve("async value"));
		await expect(promise).resolves.toBe("async value");
	});
});
