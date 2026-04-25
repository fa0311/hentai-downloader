import fs from "node:fs";
import "dotenv/config";

const checkHeartbeat = async (path, max) => {
    const data = await fs.promises.readFile(path, "utf8");
    const then = parseFloat(data.trim());
    return Date.now() / 1000 - then <= max;
}

const checkStatus = async (path) => {
    const data = await fs.promises.readFile(path, "utf8");
    return data.trim() === "true";
}

const hb = await checkHeartbeat( process.env.HEARTBEAT_PATH, 120);
const db = await checkStatus( process.env.COMPLETION_STATUS_PATH );

process.exit((hb && db) ? 0 : 1);
