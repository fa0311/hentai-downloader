import { createCompleter } from "./completer.js";

export const sleep = async (ms: number, signal?: AbortSignal) => {
	if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
	const { promise, resolve, reject } = createCompleter<void>();
	const id = setTimeout(resolve, ms);
	const listener = () => {
		clearTimeout(id);
		reject(new DOMException("Aborted", "AbortError"));
	};
	signal?.addEventListener("abort", listener, { once: true });
	try {
		await promise;
	} finally {
		signal?.removeEventListener("abort", listener);
	}
};
