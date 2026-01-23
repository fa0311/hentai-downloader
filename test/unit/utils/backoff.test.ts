import { beforeEach, describe, expect, it, vi } from "vitest";
import { exponentialBackoff } from "../../../src/utils/backoff.js";
import { counter } from "../../../src/utils/counter.js";

vi.mock("../../../src/utils/sleep.js", () => ({
	sleep: vi.fn().mockResolvedValue(undefined),
}));

describe("exponentialBackoff", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns value immediately on first success", async () => {
		const callback = vi.fn().mockResolvedValue({ type: "success", value: "result" });
		const backoff = exponentialBackoff({ baseDelayMs: 100, maxRetries: 3 });

		const result = await backoff(callback);

		expect(result).toBe("result");
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("retries on error and eventually succeeds", async () => {
		const { sleep } = await import("../../../src/utils/sleep.js");
		const callback = vi
			.fn()
			.mockResolvedValueOnce({ type: "error", error: new Error("fail 1") })
			.mockResolvedValueOnce({ type: "error", error: new Error("fail 2") })
			.mockResolvedValueOnce({ type: "success", value: "success" });

		const backoff = exponentialBackoff({ baseDelayMs: 100, maxRetries: 5 });

		const result = await backoff(callback);

		expect(result).toBe("success");
		expect(callback).toHaveBeenCalledTimes(3);
		expect(sleep).toHaveBeenCalledTimes(2);
		expect(sleep).toHaveBeenNthCalledWith(1, 100, undefined);
		expect(sleep).toHaveBeenNthCalledWith(2, 200, undefined);
	});

	it("throws AggregateError when maxRetries is reached", async () => {
		const callback = vi.fn().mockResolvedValue({ type: "error", error: new Error("always fail") });

		const backoff = exponentialBackoff({ baseDelayMs: 100, maxRetries: 3 });

		await expect(backoff(callback)).rejects.toThrow(AggregateError);
		await expect(backoff(callback)).rejects.toThrow("Maximum retry attempts exceeded");

		expect(callback).toHaveBeenCalledTimes(6);
	});

	it("handles maxRetries=0 (fails immediately)", async () => {
		const callback = vi.fn().mockResolvedValue({ type: "error", error: new Error("fail") });

		const backoff = exponentialBackoff({ baseDelayMs: 100, maxRetries: 0 });

		await expect(backoff(callback)).rejects.toThrow(AggregateError);
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("throws on abort signal", async () => {
		const controller = new AbortController();
		controller.abort();

		const callback = vi.fn();
		const backoff = exponentialBackoff({ baseDelayMs: 100, maxRetries: 3, signal: controller.signal });

		await expect(backoff(callback)).rejects.toThrow("Aborted");
		expect(callback).not.toHaveBeenCalled();
	});

	it("passes signal to sleep", async () => {
		const { sleep } = await import("../../../src/utils/sleep.js");
		const controller = new AbortController();
		const callback = vi.fn().mockResolvedValue({ type: "error", error: new Error("fail") });

		const backoff = exponentialBackoff({ baseDelayMs: 100, maxRetries: 3, signal: controller.signal });

		const promise = backoff(callback);
		await expect(promise).rejects.toThrow(AggregateError);

		expect(sleep).toHaveBeenCalledWith(expect.any(Number), controller.signal);
	});

	it("calculates exponential backoff correctly", async () => {
		const { sleep } = await import("../../../src/utils/sleep.js");
		const callback = vi
			.fn()
			.mockResolvedValueOnce({ type: "error", error: new Error("1") })
			.mockResolvedValueOnce({ type: "error", error: new Error("2") })
			.mockResolvedValueOnce({ type: "error", error: new Error("3") })
			.mockResolvedValueOnce({ type: "success", value: "ok" });

		const backoff = exponentialBackoff({ baseDelayMs: 10, maxRetries: 5 });

		await backoff(callback);

		expect(sleep).toHaveBeenNthCalledWith(1, 10, undefined);
		expect(sleep).toHaveBeenNthCalledWith(2, 20, undefined);
		expect(sleep).toHaveBeenNthCalledWith(3, 40, undefined);
	});

	it("accumulates all errors in AggregateError", async () => {
		const error1 = new Error("error 1");
		const error2 = new Error("error 2");
		const callback = vi
			.fn()
			.mockResolvedValueOnce({ type: "error", error: error1 })
			.mockResolvedValueOnce({ type: "error", error: error2 });

		const backoff = exponentialBackoff({ baseDelayMs: 100, maxRetries: 2 });

		try {
			await backoff(callback);
			expect.fail("Should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(AggregateError);
			expect((error as AggregateError).errors).toEqual([error1, error2]);
		}
	});

	it("throws when aborted during retry sleep", async () => {
		const { sleep } = await import("../../../src/utils/sleep.js");
		const controller = new AbortController();
		const callback = vi
			.fn()
			.mockResolvedValueOnce({ type: "error", error: new Error("fail") })
			.mockResolvedValueOnce({ type: "success", value: "success" });

		vi.mocked(sleep).mockImplementationOnce(async () => {
			controller.abort();
			throw new DOMException("Aborted", "AbortError");
		});

		const backoff = exponentialBackoff({ baseDelayMs: 100, maxRetries: 3, signal: controller.signal });

		await expect(backoff(callback)).rejects.toThrow(DOMException);
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("checks abort status at the beginning of each retry loop", async () => {
		const controller = new AbortController();
		const callCount = counter();
		const callback = vi.fn().mockImplementation(async () => {
			callCount.increment();
			if (callCount.value() === 2) {
				controller.abort();
			}
			return { type: "error", error: new Error("fail") };
		});

		const backoff = exponentialBackoff({ baseDelayMs: 100, maxRetries: 10, signal: controller.signal });

		await expect(backoff(callback)).rejects.toThrow("Aborted");
		expect(callback).toHaveBeenCalledTimes(2);
	});

	it("cleans up and does not call callback after abort", async () => {
		const controller = new AbortController();
		controller.abort();

		const callback = vi.fn();
		const backoff = exponentialBackoff({ baseDelayMs: 100, maxRetries: 5, signal: controller.signal });

		await expect(backoff(callback)).rejects.toThrow("Aborted");

		expect(callback).not.toHaveBeenCalled();
	});
});
