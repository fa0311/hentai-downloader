import boxen from "boxen";
import chalk from "chalk";
import "dotenv/config";
import ErrorStackParser from "error-stack-parser";

export const catchError = (error: any) => {
	if (error instanceof Error) {
		const frames = ErrorStackParser.parse(error);
		const className = (error as any)?.constructor?.name ?? "<unknown>";
		const trace = boxen(chalk.gray(frames.map((f) => `at ${f.toString()}`).join("\n")), {
			padding: 1,
			borderColor: "gray",
		});
		return boxen(`${chalk.red(`${chalk.bold(className)}\n\n${error.message}`)}\n\n${trace}`, {
			padding: 1,
			borderColor: "red",
		});
	} else {
		return boxen(chalk.red(JSON.stringify(error)), {
			padding: 1,
			borderColor: "red",
		});
	}
};
