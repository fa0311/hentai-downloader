import cliProgress from "cli-progress";
import "dotenv/config";
import fs from "node:fs";
import "./utils/proxy";

const getContentDomain = () => {
	// https://ltn.gold-usergeneratedcontent.net/common.jsのdomain2を参考に実装
	return "gold-usergeneratedcontent.net";
};

type GGJsCode = {
	case: string[];
	b: string;
	o: {
		default: string;
		match: string;
	};
};
const getGGJsCode = async (): Promise<GGJsCode> => {
	const ggJsUrl = `https://ltn.${getContentDomain()}/gg.js?_=${Date.now()}`;
	const response = await fetch(ggJsUrl);
	const ggJsText = await response.text();

	const bMatch = /b:\s*'(\d+)\/'/.exec(ggJsText);
	if (!bMatch) {
		throw new Error("Failed to extract directory1 token");
	}

	const caseMatches = [...ggJsText.matchAll(/case\s+(\d+):/g)];
	const caseArray = caseMatches.map((match) => match[1]);

	const oMatches = [...ggJsText.matchAll(/o\s*=\s*(\d+);/g)];
	if (oMatches.length < 2) {
		throw new Error("Failed to extract 'o' values");
	}
	const defaultO = oMatches[0][1];
	const matchO = oMatches[1][1];

	return {
		case: caseArray,
		b: bMatch[1],
		o: {
			default: defaultO,
			match: matchO,
		},
	};
};

// 画像ハッシュからwebpへのURLを生成する
const getWebpUrlFromHash = async (hash: string, domain: string, ggJs: GGJsCode): Promise<string> => {
	const directory1 = ggJs.b;

	const dir2PartArray = /^.*(..)(.)$/.exec(hash);
	if (!dir2PartArray) {
		throw new Error("Invalid hash format");
	}
	const directory2 = parseInt(dir2PartArray[2] + dir2PartArray[1], 16).toString();

	const subdomain = ggJs.case.includes(directory2)
		? "w" + (parseInt(ggJs.o.match) + 1)
		: "w" + (parseInt(ggJs.o.default) + 1);

	return `https://${subdomain}.${domain}/${directory1}/${directory2}/${hash}.webp`;
};

type GalleryInfo = {
	files: {
		hash: string;
		height: number;
		width: number;
		name: string;
		hasavif: boolean;
	}[];
	language_localname: string;
	blocked: number;
	date: string;
	characters: {
		character: string;
		url: string;
	}[];
	datepublished: string;
	japanese_title: string;
	galleryurl: string;
	languages: string[]; // ?
	related: number[];
	video: null; // ?
	type: string;
	scene_indexes: number[]; // ?
	language_url: string;
	tags: {
		male?: "1" | "";
		url: string;
		tag: string;
		flame?: "1" | "";
	}[];
	title: string;
	language: string;
	parodys: {
		parody: string;
		url: string;
	}[];
	artists: {
		artist: string;
		url: string;
	}[];
	groups: null; // ?
	videofilename: null; // ?
	id: string;
};

const getGalleries = async (id: string): Promise<GalleryInfo> => {
	const galleriesUrl = `https://ltn.${getContentDomain()}/galleries/${id}.js`;
	const response = await fetch(galleriesUrl);
	const galleriesJsText = await response.text();

	const jsonText = galleriesJsText
		.replace(/^var galleryinfo = /, "")
		.trim()
		.replace(/;$/, "");
	const galleries = JSON.parse(jsonText);

	return galleries;
};

const downloadImage = async (
	files: { url: string; name: string }[],
	title: string,
	id: string,
	path: string,
	parallelCount: number,
	waitTimeMin: number,
	waitTimeMax: number,
) => {
	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	const progressBar = new cliProgress.SingleBar(
		{
			format: `Progress ${title} |{bar}| {percentage}% || {value}/{total} Items || {status} {item}`,
		},
		cliProgress.Presets.shades_classic,
	);
	progressBar.start(files.length, 0);

	const result: {
		success: boolean;
		url: string;
		name: string;
	}[] = [];

	for (let i = 0; i < files.length; i += parallelCount) {
		const chunk = files.slice(i, i + parallelCount);

		const waitTime = Math.floor(Math.random() * (waitTimeMax - waitTimeMin + 1)) + waitTimeMin;
		await wait(waitTime);

		await Promise.all(
			chunk.map(async (file) => {
				const response = await fetch(file.url, {
					headers: {
						accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
						"accept-language": "ja-JP,ja;q=0.9",
						"cache-control": "no-cache",
						pragma: "no-cache",
						priority: "u=1, i",
						"sec-ch-ua": '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
						"sec-ch-ua-mobile": "?0",
						"sec-ch-ua-platform": '"Windows"',
						"sec-fetch-dest": "image",
						"sec-fetch-mode": "no-cors",
						"sec-fetch-site": "cross-site",
						"sec-fetch-storage-access": "none",
						Referer: `https://hitomi.la/reader/${id}.html`,
					},
				});
				if (!response.ok) {
					console.error(`Failed to download: ${file.url} - ${response.status} ${response.statusText}`);
					result.push({
						success: false,
						url: file.url,
						name: file.name,
					});
					progressBar.increment(1, { item: file.name, status: "Failed" });
					return;
				}
				const arrayBuffer = await response.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);
				fs.writeFileSync(`${path}/${file.name}`, buffer);

				result.push({
					success: true,
					url: file.url,
					name: file.name,
				});

				progressBar.increment(1, { item: file.name, status: "Downloaded" });
			}),
		);
	}
	progressBar.stop();
	return result;
};

const downloadManga = async (
	id: string,
	path: string,
	config: {
		parallelCount: number;
		waitTimeMin: number;
		waitTimeMax: number;
		retryCount: number;
		retryParallelCount?: number;
		retryWaitTimeMin?: number;
		retryWaitTimeMax?: number;
	} = {
		parallelCount: 5,
		waitTimeMin: 400,
		waitTimeMax: 600,
		retryCount: 3,
		retryParallelCount: 3,
		retryWaitTimeMin: 800,
		retryWaitTimeMax: 1000,
	},
) => {
	console.time(`downloadManga_${id}`);

	console.log(`Downloading manga ID: ${id} to path: ${path} with config:`, config);

	const domain = getContentDomain();
	const ggJs = await getGGJsCode();

	const galleries = await getGalleries(id);

	const files = await Promise.all(
		galleries.files.map(async (file) => {
			const webpUrl = await getWebpUrlFromHash(file.hash, domain, ggJs);
			return {
				...file,
				webpUrl,
			};
		}),
	);

	// ディレクトリがなければ作成
	if (!fs.existsSync(path)) {
		fs.mkdirSync(path, { recursive: true });
	}

	fs.writeFileSync(`${path}/galleries.json`, JSON.stringify(galleries, null, 2));

	const downloadResults = await downloadImage(
		files.map((file) => ({
			url: file.webpUrl,
			name: file.name.replace(/\.[^/.]+$/, "") + ".webp",
		})),
		galleries.title,
		id,
		path,
		config.parallelCount,
		config.waitTimeMin,
		config.waitTimeMax,
	);

	let remainingFailed = downloadResults.filter((result) => !result.success);

	if (remainingFailed.length > 0 && config.retryCount > 0) {
		for (let attempt = 1; attempt <= config.retryCount && remainingFailed.length > 0; attempt++) {
			console.log(`Retrying ${remainingFailed.length} failed downloads... (attempt ${attempt}/${config.retryCount})`);

			const retryResults = await downloadImage(
				remainingFailed.map((file) => ({
					url: file.url,
					name: file.name,
				})),
				`${galleries.title} (Retry ${attempt}/${config.retryCount})`,
				id,
				path,
				config.retryParallelCount ?? config.parallelCount,
				config.retryWaitTimeMin ?? config.waitTimeMin,
				config.retryWaitTimeMax ?? config.waitTimeMax,
			);

			remainingFailed = retryResults.filter((result) => !result.success);
		}

		if (remainingFailed.length > 0) {
			console.error(`The following files failed to download after retrying ${config.retryCount} times:`);
			remainingFailed.forEach((file) => {
				console.error(`- ${file.name} (${file.url})`);
			});
			fs.writeFileSync(`${path}/errors.json`, JSON.stringify(remainingFailed, null, 2));
		} else {
			console.log(`All files downloaded successfully after retrying.`);
		}
	} else if (remainingFailed.length > 0) {
		console.error(`Some files failed to download, but retryCount is 0. Writing errors.json...`);
		fs.writeFileSync(`${path}/errors.json`, JSON.stringify(remainingFailed, null, 2));
	}

	console.timeEnd(`downloadManga_${id}`);
};

// メイン関数実行
const run = async () => {
	try {
		await downloadManga("3729801", `./downloads/3729801-2`, {
			parallelCount: 5,
			waitTimeMin: 400,
			waitTimeMax: 600,
			retryCount: 3,
			retryParallelCount: 3,
			retryWaitTimeMin: 800,
			retryWaitTimeMax: 1000,
		});
	} catch (error) {
		console.error("Error in main execution:", error);
	}
};

run();
