import chalk from "chalk";
import cliProgress from "cli-progress";
import cliTruncate from "cli-truncate";
import stringWidth from "string-width";

const fitText = (str: string, width: number) => {
	const truncated = cliTruncate(str, width, { position: "middle" });
	const w = stringWidth(truncated);
	const pad = Math.max(0, width - w);
	return truncated + " ".repeat(pad);
};

type ProgressCallback = {
	total: number;
	filename: string;
	hidden: boolean;
};

type MultiProgressCallback = {
	create: (bar: ProgressCallback, callback: (bar: { increment: () => void }) => Promise<void>) => Promise<void>;
};

type MultiProgressParam = {
	hidden?: boolean;
};

export const progress = async (
	params: MultiProgressParam,
	callback: (progress: MultiProgressCallback) => Promise<void>,
) => {
	const multibar = new cliProgress.MultiBar(
		{
			clearOnComplete: true,
			stopOnComplete: true,
			hideCursor: true,
			format: `⏳ {filename} ${chalk.cyan("{bar}")} ${chalk.bold("{percentage}%")} | {value}/{total} | ETA:{eta}s`,
			linewrap: true,
			barsize: 80,
			stream: process.stdout,
		},
		cliProgress.Presets.shades_classic,
	);
	try {
		await callback({
			create: async ({ total, filename, hidden }, callback) => {
				if (hidden || params.hidden) {
					await callback({ increment: () => {} });
				}
				const bar = multibar.create(total, 0, {
					filename: fitText(filename, 20),
				});
				try {
					await callback({
						increment: () => bar.increment(),
					});
				} finally {
					multibar.remove(bar);
				}
			},
		});
	} finally {
		multibar.stop();
	}
};
