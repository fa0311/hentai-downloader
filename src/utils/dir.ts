import fs from "node:fs/promises";

export const ensureDirExists = async (dirPath: string) => {
	try {
		await fs.access(dirPath);
	} catch {
		await fs.mkdir(dirPath, { recursive: true });
	}
	return dirPath;
};

export const listSubdirNames = async (dirPath: string): Promise<string[]> => {
	const entries = await fs.readdir(dirPath, { withFileTypes: true });

	return entries
		.filter((e) => e.isDirectory())
		.map((e) => e.name)
		.sort((a, b) => a.localeCompare(b));
};
