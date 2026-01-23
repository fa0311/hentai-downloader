import { describe, expect, it, vi } from "vitest";
import { sleep } from "../../../src/utils/sleep.js";

describe("sleep", () => {
	it("waits for specified milliseconds", async () => {
		vi.useFakeTimers();
		let completed = false;
		const promise = sleep(1000).then(() => {
			completed = true;
		});
		expect(completed).toBe(false);
		await vi.advanceTimersByTimeAsync(999);
		expect(completed).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		await promise;
		expect(completed).toBe(true);
		vi.useRealTimers();
	});

	it("can be aborted with AbortSignal", async () => {
		vi.useFakeTimers();
		const controller = new AbortController();
		const promise = sleep(1000, controller.signal);
		await vi.advanceTimersByTimeAsync(500);
		controller.abort();
		await expect(promise).rejects.toThrow(DOMException);
		await expect(promise).rejects.toHaveProperty("name", "AbortError");
		vi.useRealTimers();
	});

	it("throws immediately if signal is already aborted", async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(sleep(1000, controller.signal)).rejects.toThrow(DOMException);
		await expect(sleep(1000, controller.signal)).rejects.toHaveProperty("name", "AbortError");
	});

	it("cleans up listeners after completion", async () => {
		vi.useFakeTimers();
		const controller = new AbortController();
		const signal = controller.signal;
		const initialListeners = signal.addEventListener.length;
		const promise = sleep(100, signal);
		await vi.advanceTimersByTimeAsync(100);
		await promise;
		controller.abort();
		vi.useRealTimers();
	});

	it("cleans up listeners after abort", async () => {
		vi.useFakeTimers();
		const controller = new AbortController();
		const promise = sleep(1000, controller.signal);
		await vi.advanceTimersByTimeAsync(500);
		controller.abort();
		await expect(promise).rejects.toThrow(DOMException);
		await vi.advanceTimersByTimeAsync(1000);
		vi.useRealTimers();
	});

	it("works without AbortSignal", async () => {
		vi.useFakeTimers();
		let completed = false;
		const promise = sleep(500).then(() => {
			completed = true;
		});
		await vi.advanceTimersByTimeAsync(500);
		await promise;
		expect(completed).toBe(true);
		vi.useRealTimers();
	});

	it("handles zero milliseconds", async () => {
		vi.useFakeTimers();
		let completed = false;
		const promise = sleep(0).then(() => {
			completed = true;
		});
		await vi.advanceTimersByTimeAsync(0);
		await promise;
		expect(completed).toBe(true);
		vi.useRealTimers();
	});
});
