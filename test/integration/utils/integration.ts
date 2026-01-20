import type { TempDir } from "./temp.js";
import { createTemp } from "./temp.js";

export interface Integration {
	temp: () => Promise<TempDir>;
	afterEachCall: () => Promise<void>;
}

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
