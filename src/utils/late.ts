export const createLate = <T extends {}>() => {
	let value: T | undefined;

	return {
		set: (v: T) => {
			value = v;
		},
		get: (): T => {
			if (value === undefined) {
				throw new Error("Late value has not been set yet");
			}
			return value;
		},
	};
};
