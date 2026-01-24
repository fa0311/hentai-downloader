type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
export const result = async <T, E extends Error>(value: Promise<T>): Promise<Result<T, E>> => {
	try {
		const v = await value;
		return { ok: true, value: v };
	} catch (err) {
		return { ok: false, error: err as E };
	}
};
