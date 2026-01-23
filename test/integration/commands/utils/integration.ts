import type { TempDir } from "./../utils/temp.js";
import { createTemp } from "./../utils/temp.js";

export type Integration = {
	temp: () => Promise<TempDir>;
	afterEachCall: () => Promise<void>;
};

export const createIntegration = (): Integration => {
	const cleanup: Array<() => Promise<void>> = [];
	return {
		temp: async () => {
			const temp = await createTemp((fn) => cleanup.push(fn));
			return temp;
		},
		afterEachCall: async () => {
			await Promise.all(cleanup.map((fn) => fn()));
			cleanup.length = 0;
		},
	};
};
