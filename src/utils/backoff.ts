export const counter = (initialValue = 0) => {
	let count = initialValue;
	return {
		increment: () => {
			count++;
		},
		value: () => count,
	};
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
type BackoffResult<T> = { type: "success"; value: T } | { type: "error"; error: Error };
type BackoffOptions = {
	baseDelayMs: number;
	maxRetries: number;
};

export const exponentialBackoff = ({ baseDelayMs, maxRetries }: BackoffOptions) => {
	return async <T>(callback: () => Promise<BackoffResult<T>>): Promise<T> => {
		const attempt = counter(0);
		while (true) {
			const result = await callback();
			if (result.type === "success") {
				return result.value;
			}
			if (result.type === "error") {
				attempt.increment();
				if (maxRetries >= 0 && attempt.value() > maxRetries) {
					throw result.error;
				}
				const delay = baseDelayMs * 2 ** (attempt.value() - 1);
				await sleep(delay);
			}
		}
	};
};
