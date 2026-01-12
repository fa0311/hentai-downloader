export const getChromeHeader = async () => {
	const url = "https://raw.githubusercontent.com/fa0311/latest-user-agent/refs/heads/main/header.json";
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch Chrome header: ${response.status} ${response.statusText}`);
	}
	const chrome = await response.json().then((json) => json.chrome as Record<string, string>);
	delete chrome.host;
	delete chrome.connection;
	return chrome;
};
