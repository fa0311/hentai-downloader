import { sleep } from "./sleep.js";

type BackoffResult<T> = { type: "success"; value: T } | { type: "error"; error: Error };
type BackoffOptions = {
	baseDelayMs: number;
	maxRetries: number;
	signal?: AbortSignal;
};

export const exponentialBackoff = ({ baseDelayMs, maxRetries, signal }: BackoffOptions) => {
	return async <T>(callback: () => Promise<BackoffResult<T>>): Promise<T> => {
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
				const delay = baseDelayMs * 2 ** (errors.length - 1);
				await sleep(delay, signal);
			}
		}
	};
};
