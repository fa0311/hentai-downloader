import "dotenv/config";

const contentsDomain = "gold-usergeneratedcontent.net";

type GGJsCode = {
	case: string[];
	b: string;
	o: {
		default: string;
		match: string;
	};
};
const getGGJsCode = async (): Promise<GGJsCode> => {
	const ggJsUrl = `https://ltn.${contentsDomain}/gg.js?_=${Date.now()}`;
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
const getWebpUrlFromHash = (hash: string, ggJs: GGJsCode): string => {
	const directory1 = ggJs.b;

	const dir2PartArray = /^.*(..)(.)$/.exec(hash);
	if (!dir2PartArray) {
		throw new Error("Invalid hash format");
	}
	const directory2 = parseInt(dir2PartArray[2] + dir2PartArray[1], 16).toString();

	const subdomainMatch = ggJs.case.includes(directory2) ? ggJs.o.match : ggJs.o.default;
	const subdomain = `w${parseInt(subdomainMatch, 10) + 1}`;
	return `https://${subdomain}.${contentsDomain}/${directory1}/${directory2}/${hash}.webp`;
};

// 動画ファイル名から動画URLを生成する
const getStreamUrlFromVideoFilename = (videoFilename: string): string => {
	return `https://streaming.${contentsDomain}/videos/${videoFilename}`;
};

type GalleryInfoFile = {
	hash: string;
	height: number;
	width: number;
	name: string;
	hasavif: boolean;
};

export type GalleryInfo = {
	files: GalleryInfoFile[];
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
	parodys:
		| {
				parody: string;
				url: string;
		  }[]
		| null;
	artists:
		| {
				artist: string;
				url: string;
		  }[]
		| null;
	groups:
		| {
				group: string;
				url: string;
		  }[]
		| null;
	videofilename: string | null; // ?
	id: string;
};

type GetGalleriesParam = {
	galleryId: string;
	headers: Record<string, string>;
};
const getGalleries = async ({ galleryId, headers }: GetGalleriesParam): Promise<GalleryInfo> => {
	const galleriesUrl = `https://ltn.${contentsDomain}/galleries/${galleryId}.js`;
	const response = await fetch(galleriesUrl, {
		headers: {
			...headers,
			accept: "*/*",
		},
	});
	if (!response.ok) {
		throw new Error(`Failed to fetch galleries info: ${response.status} ${response.statusText}`);
	}
	const galleriesJsText = await response.text();

	const jsonText = galleriesJsText
		.replace(/^var galleryinfo = /, "")
		.trim()
		.replace(/;$/, "");
	const galleries = JSON.parse(jsonText);

	return galleries;
};

type DownloadImages = {
	fileHashs: string[];
	ggJs: GGJsCode;
	headers: Record<string, string>;
};
const downloadImages = async ({ fileHashs, ggJs, headers }: DownloadImages) => {
	const webpUrls = fileHashs.map((fileHash) => {
		const webpUrl = getWebpUrlFromHash(fileHash, ggJs);
		return webpUrl;
	});

	const list = webpUrls.map((webpUrl) => {
		const callback = async () => {
			const response = await fetch(webpUrl, {
				headers: {
					...headers,
					accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to download: ${webpUrl} - ${response.status} ${response.statusText}`);
			}
			return response;
		};
		return callback;
	});

	return list;
};

type DownloadHitomiParam = {
	videofilename: string;
	headers: Record<string, string>;
};

const downloadVideo = async ({ videofilename, headers }: DownloadHitomiParam) => {
	const streamFile = getStreamUrlFromVideoFilename(videofilename);
	const callback = async () => {
		const response = await fetch(streamFile, {
			headers: {
				...headers,
				accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
				range: "bytes=0-",
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to download: ${streamFile} - ${response.status} ${response.statusText}`);
		}
		return response;
	};

	return callback;
};

type DownloadHitomiGalleriesParam = {
	galleryId: string;
	additionalHeaders?: Record<string, string>;
};
type DownloadFileInfo =
	| { type: "image"; file: GalleryInfoFile; callback: () => Promise<Response> }
	| { type: "video"; file: { name: string }; callback: () => Promise<Response> };

export const downloadHitomiGalleries = async ({ galleryId, additionalHeaders = {} }: DownloadHitomiGalleriesParam) => {
	const headers = {
		...additionalHeaders,
		"accept-language": "ja-JP,ja;q=0.9",
		"cache-control": "no-cache",
		pragma: "no-cache",
		referer: `https://hitomi.la/reader/${galleryId}.html`,
	};
	const ggJs = await getGGJsCode();
	const galleries = await getGalleries({ galleryId, headers });

	const list = [] as DownloadFileInfo[];

	const fileHashs = galleries.files.map((e) => e.hash);
	const imageList = await downloadImages({ fileHashs, ggJs, headers });
	for (const [index, file] of galleries.files.entries()) {
		list.push({ type: "image", file, callback: imageList[index] });
	}

	if (galleries.videofilename) {
		const video = await downloadVideo({ videofilename: galleries.videofilename, headers });
		list.push({ type: "video", file: { name: galleries.videofilename }, callback: video });
	}
	return [galleries, list] as const;
};
