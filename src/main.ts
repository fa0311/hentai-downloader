import { Semaphore } from "async-mutex";
import { socksDispatcher } from "fetch-socks";
import fs from "node:fs/promises";
import { downloadHitomi } from "./hitomi.js";
import { exponentialBackoff } from "./utils/backoff.js";
import { parseEnv } from "./utils/env.js";
import { getChromeHeader } from "./utils/header.js";

const env = await parseEnv();
if (env.SOCKS_HOST !== undefined && env.SOCKS_PORT !== undefined) {
	const dispatcher = socksDispatcher({
		type: env.SOCKS_TYPE,
		host: env.SOCKS_HOST,
		port: env.SOCKS_PORT,
		userId: env.SOCKS_USER,
		password: env.SOCKS_PASSWORD,
	});
	(globalThis as any)[Symbol.for("undici.globalDispatcher.1")] = dispatcher;
	console.log("Using SOCKS proxy:", `${env.SOCKS_HOST}:${env.SOCKS_PORT}`);
}

const path = `./downloads/3672330-2`;

const additionalHeaders = await getChromeHeader();
const [galleries, tasks] = await downloadHitomi("3672330", { additionalHeaders });

try {
	await fs.access(path);
} catch {
	await fs.mkdir(path, { recursive: true });
}

await fs.writeFile(`${path}/galleries.json`, JSON.stringify(galleries, null, 2));

const semaphore = new Semaphore(5);

const backoff = exponentialBackoff({ baseDelayMs: 500, maxRetries: 10 });

console.time("download");
await Promise.all(
	tasks.map(async ([file, task]) => {
		const release = await semaphore.runExclusive(async () => {
			return backoff(async () => task());
		});
		const arrayBuffer = await release.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		await fs.writeFile(`${path}/${file.name}`, buffer);
	}),
);

console.timeEnd("download");
