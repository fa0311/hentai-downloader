type HeaderType = {
	chrome: Record<string, string>;
	"chrome-fetch": Record<string, string>;
	"chrome-xhr": Record<string, string>;
	edge: Record<string, string>;
	"edge-fetch": Record<string, string>;
	"edge-xhr": Record<string, string>;
	firefox: Record<string, string>;
	"firefox-xhr": Record<string, string>;
	"firefox-fetch": Record<string, string>;
	"headless-chrome": Record<string, string>;
	"headless-chrome-fetch": Record<string, string>;
};

export const getChromeHeader = async () => {
	const url = "https://raw.githubusercontent.com/fa0311/latest-user-agent/refs/heads/main/header.json";
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch Chrome header: ${response.status} ${response.statusText}`);
	}
	const header = (await response.json()) as HeaderType;
	const chrome = header.chrome;
	delete chrome.host;
	delete chrome.connection;
	return chrome;
};
