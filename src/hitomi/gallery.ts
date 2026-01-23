import { z } from "zod";
import { HentaiHttpError, HentaiParseError, HentaiZodParseError } from "./../utils/error.js";

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
		throw new HentaiParseError("Failed to extract 'b' value from gg.js");
	}

	const caseMatches = [...ggJsText.matchAll(/case\s+(\d+):/g)];
	const caseArray = caseMatches.map((match) => match[1]);

	const oMatches = [...ggJsText.matchAll(/o\s*=\s*(\d+);/g)];
	if (oMatches.length < 2) {
		throw new HentaiParseError("Failed to extract 'o' values from gg.js");
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

const getWebpUrlFromHash = (hash: string, ggJs: GGJsCode): string => {
	const directory1 = ggJs.b;

	const dir2PartArray = /^.*(..)(.)$/.exec(hash);
	if (!dir2PartArray) {
		throw new HentaiParseError(`Invalid hash format: ${hash}`);
	}
	const directory2 = parseInt(dir2PartArray[2] + dir2PartArray[1], 16).toString();

	const subdomainMatch = ggJs.case.includes(directory2) ? ggJs.o.match : ggJs.o.default;
	const subdomain = `w${parseInt(subdomainMatch, 10) + 1}`;
	return `https://${subdomain}.${contentsDomain}/${directory1}/${directory2}/${hash}.webp`;
};

const getStreamUrlFromVideoFilename = (videoFilename: string): string => {
	return `https://streaming.${contentsDomain}/videos/${videoFilename}`;
};

export const GalleryInfoFileSchema = z.strictObject({
	hash: z.string(),
	height: z.number(),
	width: z.number(),
	name: z.string(),
	single: z.union([z.literal(0), z.literal(1), z.undefined()]).transform((x) => Boolean(x)),
	hasavif: z.union([z.literal(0), z.literal(1), z.undefined()]).transform((x) => Boolean(x)),
	hasjxl: z.union([z.literal(0), z.literal(1), z.undefined()]).transform((x) => Boolean(x)),
	haswebp: z.union([z.literal(0), z.literal(1), z.undefined()]).transform((x) => Boolean(x)),
});
export type GalleryInfoFile = z.infer<typeof GalleryInfoFileSchema>;

export const GalleryInfoSchema = z.strictObject({
	language_localname: z.string().optional(),
	language_url: z.string().optional(),
	japanese_title: z.string().optional(),
	id: z.number().or(z.string().transform((val) => Number(val))),
	title: z.string(),
	language: z.string().optional(),
	galleryurl: z.string(),
	datepublished: z.undefined().or(z.string().transform((val) => new Date(val))),
	videofilename: z.string().optional(),
	video: z.string().optional(),
	date: z.string().transform((val) => new Date(val)),
	blocked: z.literal(0).optional(),
	type: z.string(),
	files: z.array(GalleryInfoFileSchema),
	scene_indexes: z.array(z.number()),
	languages: z.array(
		z.strictObject({
			galleryid: z.number().or(z.string().transform((val) => Number(val))),
			language_localname: z.string(),
			url: z.string(),
			name: z.string(),
		}),
	),
	related: z.array(z.number().or(z.string().transform((val) => Number(val)))).optional(),
	artists: z.array(z.strictObject({ artist: z.string(), url: z.string() })).optional(),
	parodys: z.array(z.strictObject({ parody: z.string(), url: z.string() })).optional(),
	characters: z.array(z.strictObject({ character: z.string(), url: z.string() })).optional(),
	tags: z
		.array(
			z.strictObject({
				url: z.string(),
				tag: z.string(),
				male: z.union([z.literal("1"), z.literal(""), z.literal(1), z.undefined()]).transform((x) => Boolean(Number(x))),
				female: z.union([z.literal("1"), z.literal(""), z.literal(1), z.undefined()]).transform((x) => Boolean(Number(x))),
			}),
		)
		.optional(),
	groups: z
		.array(
			z.strictObject({
				group: z.string(),
				url: z.string(),
			}),
		)
		.optional(),
});

export type GalleryInfo = z.infer<typeof GalleryInfoSchema>;

const removeNulls = (obj: Record<string, unknown>) => {
	const entries = Object.entries(obj).map(([k, val]) => [k, val === null ? undefined : val]);
	return Object.fromEntries(entries);
};

type GetGalleriesParam = {
	galleryId: number;
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
		throw new HentaiHttpError(`Failed to fetch galleries: ${galleriesUrl} - ${response.status} ${response.statusText}`);
	}
	const galleriesJsText = await response.text();
	const jsonText = galleriesJsText
		.replace(/^var galleryinfo = /, "")
		.trim()
		.replace(/;$/, "");
	const obj = await z.looseObject({}).safeParseAsync(JSON.parse(jsonText));
	if (obj.success) {
		const prepared = removeNulls(obj.data);
		const parsed = await GalleryInfoSchema.safeParseAsync(prepared);
		if (parsed.success) {
			return parsed.data;
		} else {
			throw new HentaiZodParseError("Failed to parse galleries JSON", parsed.error);
		}
	} else {
		throw new HentaiZodParseError("Failed to parse galleries JSON", obj.error);
	}
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
	const callback = async (signal: AbortSignal) => {
		const response = await fetch(streamFile, {
			headers: {
				...headers,
				accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
				range: "bytes=0-",
			},
			signal: signal,
		});
		return response;
	};

	return callback;
};

type DownloadHitomiGalleriesParam = {
	galleryId: number;
	additionalHeaders?: Record<string, string>;
};

export type DownloadFileInfo =
	| {
			type: "image";
			file: GalleryInfoFile;
			callback: (signal: AbortSignal) => Promise<Response>;
	  }
	| {
			type: "video";
			file: { name: string };
			callback: (signal: AbortSignal) => Promise<Response>;
	  };

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
		const video = await downloadVideo({
			videofilename: galleries.videofilename,
			headers,
		});
		list.push({
			type: "video",
			file: { name: galleries.videofilename },
			callback: video,
		});
	}
	return [galleries, list] as const;
};
