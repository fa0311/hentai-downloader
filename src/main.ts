import fs from "node:fs";
import { downloadHitomi } from "./hitomi.js";

const path = `./downloads/3729801-2`;
const [galleries, tasks] = await downloadHitomi("3729801");

if (!fs.existsSync(path)) {
	fs.mkdirSync(path, { recursive: true });
}

fs.writeFileSync(`${path}/galleries.json`, JSON.stringify(galleries, null, 2));

for (const [file, task] of tasks) {
	const response = await task();
	const arrayBuffer = await response.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	fs.writeFileSync(`${path}/${file.name}`, buffer);
}
