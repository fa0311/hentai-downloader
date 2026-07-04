import fs from "node:fs";
import { Command, Flags } from "@oclif/core";
import { catchError } from "../utils/catch.js";
import { toCheckpoint } from "../utils/checkpoint.js";
import { outputFile } from "../utils/file.js";
import { progress } from "./../utils/progress.js";

export default class Migration extends Command {
	static args = {};

	static flags = {
		hostname: Flags.string({
			description: "Hostname to migrate",
			required: true,
		}),
		checkpoint: Flags.string({
			required: true,
			description: "Path to checkpoint file",
		}),
		quiet: Flags.boolean({
			char: "q",
			description: "Suppress non-error output",
			default: false,
		}),
		help: Flags.help(),
		version: Flags.version(),
	};

	async run() {
		const { flags } = await this.parse(Migration);

		const raw = await fs.promises.readFile(flags.checkpoint, "utf8");
		const data = raw
			.split("\n")
			.filter((line) => line.trim())
			.map(Number);

		await fs.promises.rename(flags.checkpoint, `${flags.checkpoint}.bak`);

		await outputFile(async (checkpointDiscriptor) => {
			const checkpoint = await checkpointDiscriptor.create(flags.checkpoint, "a");
			await progress({ hidden: flags.quiet }, async (multiBar) => {
				const opt = { total: data.length, filename: "Overall", hidden: flags.quiet };
				await multiBar.create(opt, async (b1) => {
					for (const p of data) {
						await checkpoint.line(toCheckpoint(p, flags.hostname));
						b1.increment();
					}
				});
			});
		});
	}

	async catch(error: Error) {
		this.log(catchError(error));
		process.exitCode = 1;
	}
}
