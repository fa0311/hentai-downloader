import { beforeEach, describe, expect, it, vi } from "vitest";
import { constantBackoffFactory, exponentialBackoffFactory, maxDelayChain, runBackoff } from "../../../src/utils/backoff.js";
import { sleep } from "../../../src/utils/sleep.js";

vi.mock("../../../src/utils/sleep.js", () => ({
	sleep: vi.fn().mockResolvedValue(undefined),
}));

describe("runBackoff", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns immediately when the first attempt succeeds", async () => {
		const callback = vi.fn().mockResolvedValue({ type: "success", value: "result" });
		const backoff = runBackoff({
			delayFactory: constantBackoffFactory({ baseDelayMs: 100 }),
			maxRetries: 3,
			chain: [],
		});

		await expect(backoff(callback)).resolves.toBe("result");

		expect(callback).toHaveBeenCalledTimes(1);
		expect(sleep).not.toHaveBeenCalled();
	});

	it("retries with delays produced by the factory and transformed by the chain", async () => {
		const controller = new AbortController();
		const callback = vi
			.fn()
			.mockResolvedValueOnce({ type: "error", error: new Error("fail 1") })
			.mockResolvedValueOnce({ type: "error", error: new Error("fail 2") })
			.mockResolvedValueOnce({ type: "success", value: "success" });
		const backoff = runBackoff({
			delayFactory: constantBackoffFactory({ baseDelayMs: 100 }),
			maxRetries: 5,
			signal: controller.signal,
			chain: [(delay) => delay + 5, maxDelayChain(120)],
		});

		await expect(backoff(callback)).resolves.toBe("success");

		expect(callback).toHaveBeenCalledTimes(3);
		expect(sleep).toHaveBeenNthCalledWith(1, 105, controller.signal);
		expect(sleep).toHaveBeenNthCalledWith(2, 105, controller.signal);
	});

	it("throws an AggregateError with the collected retry errors", async () => {
		const error1 = new Error("error 1");
		const error2 = new Error("error 2");
		const callback = vi
			.fn()
			.mockResolvedValueOnce({ type: "error", error: error1 })
			.mockResolvedValueOnce({ type: "error", error: error2 });
		const backoff = runBackoff({
			delayFactory: constantBackoffFactory({ baseDelayMs: 100 }),
			maxRetries: 2,
			chain: [],
		});

		await expect(backoff(callback)).rejects.toMatchObject({
			message: "Maximum retry attempts exceeded",
			errors: [error1, error2],
		});
	});

	it("stops before the first attempt when already aborted", async () => {
		const controller = new AbortController();
		controller.abort();
		const callback = vi.fn();
		const backoff = runBackoff({
			delayFactory: constantBackoffFactory({ baseDelayMs: 100 }),
			maxRetries: 3,
			signal: controller.signal,
			chain: [],
		});

		await expect(backoff(callback)).rejects.toThrow("Aborted");

		expect(callback).not.toHaveBeenCalled();
		expect(sleep).not.toHaveBeenCalled();
	});

	it("propagates aborts that happen while waiting between retries", async () => {
		const controller = new AbortController();
		const callback = vi
			.fn()
			.mockResolvedValueOnce({ type: "error", error: new Error("fail") })
			.mockResolvedValueOnce({ type: "success", value: "success" });
		vi.mocked(sleep).mockImplementationOnce(async (_ms, signal) => {
			expect(signal).toBe(controller.signal);
			controller.abort();
			throw new DOMException("Aborted", "AbortError");
		});
		const backoff = runBackoff({
			delayFactory: constantBackoffFactory({ baseDelayMs: 100 }),
			maxRetries: 3,
			signal: controller.signal,
			chain: [],
		});

		await expect(backoff(callback)).rejects.toThrow(DOMException);

		expect(callback).toHaveBeenCalledTimes(1);
	});
});

describe("exponentialBackoffFactory", () => {
	it("creates independent exponential delay sequences", () => {
		const factory = exponentialBackoffFactory({ baseDelayMs: 10 });
		const first = factory();
		const second = factory();

		expect([first(), first(), first()]).toEqual([10, 20, 40]);
		expect([second(), second()]).toEqual([10, 20]);
	});
});
