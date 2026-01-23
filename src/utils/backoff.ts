const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
type BackoffResult<T> = { type: "success"; value: T } | { type: "error"; error: Error };
type BackoffOptions = {
	baseDelayMs: number;
	maxRetries: number;
};

export const exponentialBackoff = ({ baseDelayMs, maxRetries }: BackoffOptions) => {
	return async <T>(callback: () => Promise<BackoffResult<T>>): Promise<T> => {
		const errors: Error[] = [];
		while (true) {
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
				await sleep(delay);
			}
		}
	};
};
