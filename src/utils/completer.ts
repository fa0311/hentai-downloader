export const createCompleter = <T>() => {
	let resolve = (_value: T | PromiseLike<T>) => {};
	let reject = (_reason?: unknown) => {};

	const promise = new Promise<T>((_resolve, _reject) => {
		resolve = _resolve;
		reject = _reject;
	});

	return { promise, resolve, reject };
};
