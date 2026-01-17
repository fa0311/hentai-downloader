import { socksDispatcher } from "fetch-socks";
import { z } from "zod";

const envSchema = z.object({
	HTTP_PROXY: z.string().optional(),
	HTTPS_PROXY: z.string().optional(),
	ALL_PROXY: z.string().optional(),
});

const parseProxyUrl = (proxyUrl: string[]) => {
	const socket5 = new URLPattern({
		protocol: "socks5:",
	});
	const socket4 = new URLPattern({
		protocol: "socks4:",
	});
	const socket5h = new URLPattern({
		protocol: "socks5h:",
	});
	const socket4a = new URLPattern({
		protocol: "socks4a:",
	});

	for (const proxy of proxyUrl) {
		const url = new URL(proxy);
		const socket5Match = socket5.exec(url);
		if (socket5Match) {
			return {
				type: 5 as const,
				ipaddress: socket5Match.hostname.input,
				port: Number(socket5Match.port) || 1080,
				username: socket5Match.username.input || undefined,
				password: socket5Match.password.input || undefined,
			};
		}
		const socket4Match = socket4.exec(url);
		if (socket4Match) {
			return {
				type: 4 as const,
				ipaddress: socket4Match.hostname.input,
				port: Number(socket4Match.port) || 1080,
				username: socket4Match.username.input || undefined,
				password: socket4Match.password.input || undefined,
			};
		}
		const socket5hMatch = socket5h.exec(url);
		if (socket5hMatch) {
			return {
				type: 5 as const,
				host: socket5hMatch.hostname.input,
				port: Number(socket5hMatch.port) || 1080,
				username: socket5hMatch.username.input || undefined,
				password: socket5hMatch.password.input || undefined,
			};
		}
		const socket4aMatch = socket4a.exec(url);
		if (socket4aMatch) {
			return {
				type: 4 as const,
				host: socket4aMatch.hostname.input,
				port: Number(socket4aMatch.port) || 1080,
				username: socket4aMatch.username.input || undefined,
				password: socket4aMatch.password.input || undefined,
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
