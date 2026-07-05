export const createCache = <T1, T2>(callback: (key: T2) => Promise<T1>) => {
	const cache = new Map<T2, Promise<T1>>();
	return async (key: T2) => {
		if (cache.has(key)) {
			// biome-ignore lint/style/noNonNullAssertion: has
			return cache.get(key)!;
		} else {
			const promise = callback(key);
			cache.set(key, promise);
			return promise;
		}
	};
};
