export const counter = (initialValue = 0) => {
	let count = initialValue;
	return {
		increment: () => {
			count++;
		},
		value: () => count,
	};
};
