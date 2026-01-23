import { describe, expect, it, vi } from "vitest";
import { getEnvProxy, initProxy } from "../../../src/utils/proxy.js";
import "dotenv/config";

describe("proxy integration tests", () => {
	const proxy = getEnvProxy();

	it.skipIf(proxy.length === 0)("request through proxy", async () => {
		const before = await fetch("https://api.ipify.org?format=json");
		const beforeData = await before.json();
		const initialized = initProxy();
		expect(initialized).toBe(true);
		const after = await fetch("https://api.ipify.org?format=json");
		const afterData = await after.json();
		expect(afterData.ip).not.toEqual(beforeData.ip);
	});

	it("return false when no proxy", () => {
		vi.stubEnv("HTTP_PROXY", "");
		vi.stubEnv("HTTPS_PROXY", "");
		vi.stubEnv("ALL_PROXY", "");
		const initialized = initProxy();
		expect(initialized).toBe(false);
		vi.unstubAllEnvs();
	});
});
