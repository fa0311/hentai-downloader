import { describe, expect, it } from "vitest";
import { parseProxyUrl } from "../../src/utils/proxy";

describe("parseProxyUrl", () => {
	it("parses socks5 proxy", () => {
		const result = parseProxyUrl(["socks5://127.0.0.1:1080"]);
		expect(result).toEqual({
			type: 5,
			ipaddress: "127.0.0.1",
			port: 1080,
			username: undefined,
			password: undefined,
		});
	});

	it("parses socks4 proxy", () => {
		const result = parseProxyUrl(["socks4://192.168.1.1:9050"]);
		expect(result).toEqual({
			type: 4,
			ipaddress: "192.168.1.1",
			port: 9050,
			username: undefined,
			password: undefined,
		});
	});

	it("parses socks5h proxy with hostname", () => {
		const result = parseProxyUrl(["socks5h://proxy.example.com:1080"]);
		expect(result).toEqual({
			type: 5,
			host: "proxy.example.com",
			port: 1080,
			username: undefined,
			password: undefined,
		});
	});

	it("parses socks4a proxy with hostname", () => {
		const result = parseProxyUrl(["socks4a://proxy.example.com:9050"]);
		expect(result).toEqual({
			type: 4,
			host: "proxy.example.com",
			port: 9050,
			username: undefined,
			password: undefined,
		});
	});

	it("uses default port 1080 when not specified", () => {
		const result = parseProxyUrl(["socks5://127.0.0.1"]);
		expect(result?.port).toBe(1080);
	});

	it("parses proxy with username and password", () => {
		const result = parseProxyUrl(["socks5://user:pass@127.0.0.1:1080"]);
		expect(result).toEqual({
			type: 5,
			ipaddress: "127.0.0.1",
			port: 1080,
			username: "user",
			password: "pass",
		});
	});

	it("parses proxy with username only", () => {
		const result = parseProxyUrl(["socks5://user@127.0.0.1:1080"]);
		expect(result).toEqual({
			type: 5,
			ipaddress: "127.0.0.1",
			port: 1080,
			username: "user",
			password: undefined,
		});
	});

	it("parses proxy with URL-encoded credentials", () => {
		const result = parseProxyUrl(["socks5://user%40name:p%40ss@127.0.0.1:1080"]);
		expect(result).toEqual({
			type: 5,
			ipaddress: "127.0.0.1",
			port: 1080,
			username: "user@name",
			password: "p@ss",
		});
	});

	it("parses IPv6 address", () => {
		const result = parseProxyUrl(["socks5://[::1]:1080"]);
		expect(result).toEqual({
			type: 5,
			ipaddress: "[::1]",
			port: 1080,
			username: undefined,
			password: undefined,
		});
	});

	it("returns first matching proxy from array", () => {
		const result = parseProxyUrl(["socks5://127.0.0.1:1080", "socks4://192.168.1.1:9050"]);
		expect(result).toEqual({
			type: 5,
			ipaddress: "127.0.0.1",
			port: 1080,
			username: undefined,
			password: undefined,
		});
	});

	it("skips unsupported protocols and returns first valid", () => {
		const result = parseProxyUrl(["http://invalid.com:8080", "socks5://127.0.0.1:1080", "socks4://192.168.1.1:9050"]);
		expect(result).toEqual({
			type: 5,
			ipaddress: "127.0.0.1",
			port: 1080,
			username: undefined,
			password: undefined,
		});
	});

	it("returns undefined for empty array", () => {
		const result = parseProxyUrl([]);
		expect(result).toBeUndefined();
	});

	it("returns undefined for unsupported protocol", () => {
		const result = parseProxyUrl(["http://proxy.example.com:8080"]);
		expect(result).toBeUndefined();
	});
});
