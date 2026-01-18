import { socksDispatcher } from "fetch-socks";
import { z } from "zod";

const envSchema = z.object({
	HTTP_PROXY: z.string().optional(),
	HTTPS_PROXY: z.string().optional(),
	ALL_PROXY: z.string().optional(),
});

export const parseProxyUrl = (proxyUrl: string[]) => {
	const socks5Pattern = new URLPattern({
		protocol: "socks5:",
	});
	const socks4Pattern = new URLPattern({
		protocol: "socks4:",
	});
	const socks5hPattern = new URLPattern({
		protocol: "socks5h:",
	});
	const socks4aPattern = new URLPattern({
		protocol: "socks4a:",
	});

	for (const proxy of proxyUrl) {
		const url = new URL(proxy);

		const socks5Match = socks5Pattern.exec(url);
		if (socks5Match) {
			return {
				type: 5 as const,
				ipaddress: url.hostname,
				port: url.port ? Number(url.port) : 1080,
				username: url.username ? decodeURIComponent(url.username) : undefined,
				password: url.password ? decodeURIComponent(url.password) : undefined,
			};
		}

		const socks4Match = socks4Pattern.exec(url);
		if (socks4Match) {
			return {
				type: 4 as const,
				ipaddress: url.hostname,
				port: url.port ? Number(url.port) : 1080,
				username: url.username ? decodeURIComponent(url.username) : undefined,
				password: url.password ? decodeURIComponent(url.password) : undefined,
			};
		}

		const socks5hMatch = socks5hPattern.exec(url);
		if (socks5hMatch) {
			return {
				type: 5 as const,
				host: url.hostname,
				port: url.port ? Number(url.port) : 1080,
				username: url.username ? decodeURIComponent(url.username) : undefined,
				password: url.password ? decodeURIComponent(url.password) : undefined,
			};
		}

		const socks4aMatch = socks4aPattern.exec(url);
		if (socks4aMatch) {
			return {
				type: 4 as const,
				host: url.hostname,
				port: url.port ? Number(url.port) : 1080,
				username: url.username ? decodeURIComponent(url.username) : undefined,
				password: url.password ? decodeURIComponent(url.password) : undefined,
			};
		}
	}
};

export const initProxy = () => {
	const env = envSchema.parse(process.env);
	const proxyUrl = [env.ALL_PROXY, env.HTTPS_PROXY, env.HTTP_PROXY].filter((v): v is string => Boolean(v));
	if (proxyUrl.length > 0) {
		const proxy = parseProxyUrl(proxyUrl);
		if (proxy) {
			const dispatcher = socksDispatcher({
				type: proxy.type,
				host: proxy.host,
				ipaddress: proxy.ipaddress,
				port: proxy.port,
				userId: proxy.username,
				password: proxy.password,
			});
			(globalThis as any)[Symbol.for("undici.globalDispatcher.1")] = dispatcher;
			return true;
		} else {
			throw new Error("Invalid proxy URL");
		}
	}
	return false;
};
