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

export type GalleryInfo = {
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

const getGalleries = async (id: string): Promise<GalleryInfo> => {
	const galleriesUrl = `https://ltn.${contentsDomain}/galleries/${id}.js`;
	const response = await fetch(galleriesUrl);
	const galleriesJsText = await response.text();

	const jsonText = galleriesJsText
		.replace(/^var galleryinfo = /, "")
		.trim()
		.replace(/;$/, "");
	const galleries = JSON.parse(jsonText);

	return galleries;
};

type DownloadHitomiParam = {
	additionalHeaders?: Record<string, string>;
	skipVideo?: boolean;
};

const downloadImages = async (
	galleries: GalleryInfo,
	ggJs: GGJsCode,
	{ additionalHeaders }: DownloadHitomiParam,
) => {
	const files = galleries.files.map((file) => {
		const webpUrl = getWebpUrlFromHash(file.hash, ggJs);
		return [file, webpUrl] as const;
	});

	const list = files.map(([file, webpUrl]) => {
		const callback = async () => {
			const response = await fetch(webpUrl, {
				headers: {
					...additionalHeaders,
					accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
					"accept-language": "ja-JP,ja;q=0.9",
					"cache-control": "no-cache",
					pragma: "no-cache",
					referer: `https://hitomi.la/reader/${galleries.id}.html`,
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to download: ${webpUrl} - ${response.status} ${response.statusText}`);
			}
			return response;
		};
		return [file, callback] as const;
	});

	return list;
};

const downloadVideo = async (galleries: GalleryInfo, { additionalHeaders }: DownloadHitomiParam) => {
	if (galleries.videofilename === null) {
		return null;
	}

	const streamFile = getStreamUrlFromVideoFilename(galleries.videofilename);

	const file = { name: galleries.videofilename! };
	const callback = async () => {
		const response = await fetch(streamFile, {
			headers: {
				...additionalHeaders,
				accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
				"accept-language": "ja-JP,ja;q=0.9",
				"cache-control": "no-cache",
				pragma: "no-cache",
				priority: "i",
				range: "bytes=0-",
				referer: `https://hitomi.la/reader/${galleries.id}.html`,
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to download: ${streamFile} - ${response.status} ${response.statusText}`);
		}
		return response;
	};

	return [file, callback] as const;
};

export const downloadHitomiGalleries = async (id: string, { additionalHeaders, skipVideo = false }: DownloadHitomiParam) => {
	const ggJs = await getGGJsCode();
	const galleries = await getGalleries(id);

	const imageList = await downloadImages(galleries, ggJs, { additionalHeaders });

	const video = !skipVideo ? await downloadVideo(galleries, { additionalHeaders }) : null;

	const list = [...imageList, ...(video ? [video] : [])];

	return [galleries, list] as const;
};
