const cache = new Map<string, any>();
export const getFromCache = <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
	if (cache.has(key)) {
		return Promise.resolve(cache.get(key) as T);
	}
	return fetcher().then((value) => {
		cache.set(key, value);
		return value;
	});
};
