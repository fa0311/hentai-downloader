import { sleep } from "./sleep.js";

type BackoffResult<T> = { type: "success"; value: T } | { type: "error"; error: Error };

type BackoffOptions = {
	delayFactory: () => () => number;
	maxRetries: number;
	chain: ((delay: number) => number)[];
	signal?: AbortSignal;
};

export const runBackoff = ({ delayFactory, maxRetries, signal, chain }: BackoffOptions) => {
	return async <T>(callback: () => Promise<BackoffResult<T>>) => {
		const delay = delayFactory();
		const errors: Error[] = [];
		while (true) {
			if (signal?.aborted) {
				throw new Error("Aborted");
			}
			const result = await callback();
			if (result.type === "success") {
				return result.value;
			}
			if (result.type === "error") {
				errors.push(result.error);
				if (maxRetries >= 0 && errors.length >= maxRetries) {
					throw new AggregateError(errors, "Maximum retry attempts exceeded");
				}
				await sleep(
					chain.reduce((acc, fn) => fn(acc), delay()),
					signal,
				);
			}
		}
	};
};

export const constantBackoffFactory = ({ baseDelayMs }: { baseDelayMs: number }) => {
	return () => () => baseDelayMs;
};

export const exponentialBackoffFactory = ({ baseDelayMs }: { baseDelayMs: number }) => {
	return () => {
		let attempt = 0;
		return () => {
			const delay = baseDelayMs * 2 ** attempt;
			attempt++;
			return delay;
		};
	};
};

export const maxDelayChain = (maxDelayMs: number) => {
	return (delay: number) => Math.min(delay, maxDelayMs);
};
