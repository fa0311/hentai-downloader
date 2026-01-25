import fs from "node:fs";
import path from "node:path";
import consumers from "node:stream/consumers";
import { Args, Command, Flags } from "@oclif/core";
import { isZipFile } from "../download.js";
import type { GalleryInfo } from "../hitomi/gallery.js";
import { catchError } from "../utils/catch.js";
import { galleryInfoToComicInfo } from "../utils/comicInfo.js";
import { copyDir, copyZip } from "../utils/dirCopy.js";
import { progress } from "./../utils/progress.js";

export default class Regenerate extends Command {
	static args = {
		input: Args.string({
			required: true,
			description: "http(s) URL or gallery ID to download",
		}),
		output: Args.string({
			required: true,
			description: "Output directory or file",
		}),
	};

	static flags = {
		quiet: Flags.boolean({
			char: "q",
			description: "Suppress non-error output",
			default: false,
		}),
		help: Flags.help(),
		version: Flags.version(),
	};

	async run() {
		const { args, flags } = await this.parse(Regenerate);
		const pattern = ["**/galleries.json", "**/*.cbz", "**/*.zip"];
		const all = await Array.fromAsync(fs.promises.glob(pattern, { cwd: args.input }));

		await progress({ hidden: flags.quiet }, async (multiBar) => {
			const opt = { total: all.length, filename: "Overall", hidden: all.length <= 1 };
			await multiBar.create(opt, async (b1) => {
				for (const p of all) {
					const [fd, output] = await (async () => {
						if (isZipFile(p)) {
							const input = path.join(args.input, p);
							const output = path.join(args.output, p);
							return [await copyZip(input), output] as const;
						} else {
							const input = path.join(args.input, path.dirname(p));
							const output = path.join(args.output, path.dirname(p));
							return [await copyDir(input), output] as const;
						}
					})();

					const rawGalleries = await consumers.json(await fd.read("galleries.json"));
					const oldComicInfo = await consumers.text(await fd.read("ComicInfo.xml"));
					const newComicInfo = galleryInfoToComicInfo(rawGalleries as unknown as GalleryInfo);
					if (oldComicInfo !== newComicInfo) {
						await fd.open(output, async (out) => {
							out.writeFile("ComicInfo.xml", newComicInfo);
						});
					}
					b1.increment();
				}
			});
		});
	}

	async catch(error: Error) {
		this.log(catchError(error));
	}
}
