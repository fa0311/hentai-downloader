import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Command, flush, handle } from "@oclif/core";
import { MainCommand } from "./command";

export const COMMANDS: Record<string, Command.Class> = {
	MainCommand,
};

type PJson = {
	name: string;
	version: string;
};
const readPjson = async (filePath: string): Promise<PJson> => {
	const content = await fs.promises.readFile(filePath, "utf-8");
	return JSON.parse(content) as PJson;
};

const target = fileURLToPath(import.meta.url);
const root = path.dirname(target);
const pJson = await readPjson(path.join(root, "../package.json"));

MainCommand.run(process.argv.slice(2), {
	root: root,
	pjson: {
		name: pJson.name,
		version: pJson.version,
		oclif: {
			commands: {
				strategy: "explicit",
				target: target,
				identifier: "COMMANDS",
			},
		},
	},
}).then(
	async () => flush(),
	async (err) => handle(err),
);
