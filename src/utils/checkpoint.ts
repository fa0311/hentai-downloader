import fs from "node:fs";
import { pathExists } from "./dir.js";

export const loadCheckpoint = async (filePath: string | undefined): Promise<number[]> => {
	if (filePath) {
		if (await pathExists(filePath)) {
			const data = await fs.promises.readFile(filePath, "utf8");
			return data.split("\n").map((line) => Number(line));
		}
	}
	return [];
};
