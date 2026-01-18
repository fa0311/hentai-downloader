import fs from "node:fs";
import "dotenv/config";

const check = async (path, max) => {
    const data = await fs.promises.readFile(path, "utf8");
    const then = parseFloat(data.trim());
    return Date.now() / 1000 - then <= max;
}

const hb = await check( process.env.HEARTBEAT_PATH, 120);
const db = await check( process.env.LAST_SUCCESS_PATH , 300);

process.exit((hb && db) ? 0 : 1);
