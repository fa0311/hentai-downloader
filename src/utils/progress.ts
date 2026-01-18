import chalk from "chalk";
import cliProgress from "cli-progress";
import { fitSymbol, fitText } from "./log";

type ProgressCallback = {
	total: number;
	filename: string;
	hidden: boolean;
};

type MultiProgressCallback = {
	log: (data: string) => void;
	create: (bar: ProgressCallback, callback: (bar: { increment: () => void }) => Promise<void>) => Promise<void>;
};

type MultiProgressParam = {
	hidden?: boolean;
};

export const progress = async (params: MultiProgressParam, callback: (progress: MultiProgressCallback) => Promise<void>) => {
	const multibar = new cliProgress.MultiBar(
		{
			clearOnComplete: true,
			stopOnComplete: true,
			hideCursor: true,
			format: `${fitSymbol("⏳")} {filename} ${chalk.cyan("{bar}")} ${chalk.bold("{percentage}%")} | {value}/{total} | ETA:{eta_formatted}`,
			linewrap: true,
			forceRedraw: true,
			barsize: 80,
			stream: process.stdout,
		},
		cliProgress.Presets.shades_classic,
	);
	try {
		await callback({
			log: (data: string) => {
				multibar.log(`${data}\n`);
			},
			create: async ({ total, filename, hidden }, callback) => {
				if (hidden || params.hidden) {
					await callback({ increment: () => {} });
				} else {
					const bar = multibar.create(total, 0, {
						filename: fitText(filename, 20),
					});
					try {
						await callback({ increment: () => bar.increment() });
					} finally {
						multibar.remove(bar);
					}
				}
			},
		});
	} finally {
		multibar.stop();
	}
};
