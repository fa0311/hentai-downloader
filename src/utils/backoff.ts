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

type BackoffOptions = {
	baseDelayMs: number;
	maxRetries: number;
};

export const exponentialBackoff = ({ baseDelayMs, maxRetries }: BackoffOptions) => {
	return async <T>(callback: () => Promise<T>): Promise<T> => {
		const attempt = counter(0);
		while (true) {
			try {
				return await callback();
			} catch (error) {
				attempt.increment();

				if (maxRetries >= 0 && attempt.value() > maxRetries) {
					throw error instanceof Error ? error : new Error(String(error));
				}

				const delay = baseDelayMs * 2 ** (attempt.value() - 1);
				console.log(`Retrying in ${delay} ms...`);
				await sleep(delay);
			}
		}
	};
};
