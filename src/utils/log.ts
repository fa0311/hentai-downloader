import boxen from "boxen";
import chalk from "chalk";
import cliTruncate from "cli-truncate";
import logSymbols from "log-symbols";
import stringWidth from "string-width";

export const fitText = (str: string, width: number) => {
	const truncated = cliTruncate(str, width, { position: "middle" });
	const w = stringWidth(truncated);
	const pad = Math.max(0, width - w);
	return `${truncated}${" ".repeat(pad)}`;
};

export const fitSymbol = (icon: string) => {
	const w = stringWidth(icon);
	return `${icon}${" ".repeat(2 - w)}`;
};

export const title = (message: string) => {
	const title = chalk.bold(`     🚀 ${message}     `);
	return `${boxen(`${title}`, { padding: 1, borderStyle: "double" })}`;
};

export const success = (message: string) => {
	return chalk.green(`${fitSymbol(logSymbols.success)} ${message}`);
};

export const info = (message: string) => {
	return chalk.cyan(`${fitSymbol(logSymbols.info)} ${message}`);
};

export const warning = (message: string) => {
	return chalk.yellow(`${fitSymbol(logSymbols.warning)} ${message}`);
};

export const error = (message: string) => {
	return chalk.red(`${fitSymbol(logSymbols.error)} ${message}`);
};
