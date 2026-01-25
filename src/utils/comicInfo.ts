import { create } from "xmlbuilder2";
import type { GalleryInfo } from "../hitomi/gallery.js";

type AgeRatingType =
	| "Not Applicable"
	| "Unknown"
	| "Rating Pending"
	| "Early Childhood"
	| "Everyone"
	| "G"
	| "Everyone 10+"
	| "PG"
	| "Kids to Adults"
	| "Teen"
	| "MA15+"
	| "Mature 17+"
	| "M"
	| "R18+"
	| "Adults Only 18+"
	| "X18+";

type ComicInfoXml = {
	summary?: string;
	title?: string;
	series?: string;

	localizedSeries?: string;
	seriesSort?: string;

	number?: number | string;
	count?: number;
	volume?: number | string;

	notes?: string;
	genre?: string;
	pageCount?: number;

	languageISO?: string;

	isbn?: string;
	gtin?: string;

	web?: string[];

	date?: Date;

	ageRating?: AgeRatingType & string;
	userRating?: number;

	seriesGroup?: string[];

	story?: { arc: string; arcNumber: string }[];

	alternateNumber?: number | string;
	alternateSeries?: string;
	alternateCount?: number;

	titleSort?: string;
	format?: string;

	writer?: string[];
	penciller?: string[];
	inker?: string[];
	colorist?: string[];
	letterer?: string[];
	coverArtist?: string[];
	editor?: string[];
	publisher?: string[];
	imprint?: string[];
	characters?: string[];
	teams?: string[];
	locations?: string[];
	translator?: string[];
	tags?: string[];

	scanInformation?: string;
	page?: { image: number; imageWidth: number; imageHeight: number }[];
};

const isNotEmpty = <T>(value: T[] | undefined): value is T[] => {
	return value !== undefined && value.length > 0;
};

export const generateComicInfoXml = (info: ComicInfoXml) => {
	const doc = create({ version: "1.0", encoding: "utf-8" }).ele("ComicInfo");
	if (info.summary) {
		doc.ele("Summary").txt(info.summary).up();
	}
	if (info.title !== undefined) {
		doc.ele("Title").txt(info.title).up();
	}
	if (info.series !== undefined) {
		doc.ele("Series").txt(info.series).up();
	}
	if (info.localizedSeries !== undefined) {
		doc.ele("LocalizedSeries").txt(info.localizedSeries).up();
	}
	if (info.seriesSort !== undefined) {
		doc.ele("SeriesSort").txt(info.seriesSort).up();
	}
	if (info.number !== undefined) {
		doc.ele("Number").txt(String(info.number)).up();
	}
	if (info.count !== undefined) {
		doc.ele("Count").txt(String(info.count)).up();
	}
	if (info.volume !== undefined) {
		doc.ele("Volume").txt(String(info.volume)).up();
	}
	if (info.notes !== undefined) {
		doc.ele("Notes").txt(info.notes).up();
	}
	if (info.genre !== undefined) {
		doc.ele("Genre").txt(info.genre).up();
	}
	if (info.pageCount !== undefined) {
		doc.ele("PageCount").txt(String(info.pageCount)).up();
	}
	if (info.languageISO !== undefined) {
		doc.ele("LanguageISO").txt(info.languageISO).up();
	}
	if (info.isbn !== undefined) {
		doc.ele("ISBN").txt(info.isbn).up();
	}
	if (info.gtin !== undefined) {
		doc.ele("GTIN").txt(info.gtin).up();
	}
	if (isNotEmpty(info.web)) {
		doc.ele("Web").txt(info.web.join(", ")).up();
	}
	if (info.date !== undefined) {
		const month = info.date.getMonth() + 1;
		doc.ele("Year").txt(String(info.date.getFullYear())).up();
		doc.ele("Month").txt(String(month)).up();
		doc.ele("Day").txt(String(info.date.getDate())).up();
	}
	if (info.ageRating !== undefined) {
		doc.ele("AgeRating").txt(info.ageRating).up();
	}
	if (info.userRating !== undefined) {
		doc.ele("UserRating").txt(String(info.userRating)).up();
	}
	if (isNotEmpty(info.seriesGroup)) {
		doc.ele("SeriesGroup").txt(info.seriesGroup.join(", ")).up();
	}
	if (isNotEmpty(info.story)) {
		const arcEle = info.story.map((s) => s.arc).join(", ");
		doc.ele("StoryArc").txt(arcEle).up();
		const arcNumberEle = info.story.map((s) => s.arcNumber).join(", ");
		doc.ele("StoryArcNumber").txt(arcNumberEle).up();
	}
	if (info.alternateNumber !== undefined) {
		doc.ele("AlternateNumber").txt(String(info.alternateNumber)).up();
	}
	if (info.alternateSeries !== undefined) {
		doc.ele("AlternateSeries").txt(info.alternateSeries).up();
	}
	if (info.alternateCount !== undefined) {
		doc.ele("AlternateCount").txt(String(info.alternateCount)).up();
	}
	if (info.titleSort !== undefined) {
		doc.ele("TitleSort").txt(info.titleSort).up();
	}
	if (info.format !== undefined) {
		doc.ele("Format").txt(info.format).up();
	}
	if (isNotEmpty(info.writer)) {
		doc.ele("Writer").txt(info.writer.join(", ")).up();
	}
	if (isNotEmpty(info.penciller)) {
		doc.ele("Penciller").txt(info.penciller.join(", ")).up();
	}
	if (isNotEmpty(info.inker)) {
		doc.ele("Inker").txt(info.inker.join(", ")).up();
	}
	if (isNotEmpty(info.colorist)) {
		doc.ele("Colorist").txt(info.colorist.join(", ")).up();
	}
	if (isNotEmpty(info.letterer)) {
		doc.ele("Letterer").txt(info.letterer.join(", ")).up();
	}
	if (isNotEmpty(info.coverArtist)) {
		doc.ele("CoverArtist").txt(info.coverArtist.join(", ")).up();
	}
	if (isNotEmpty(info.editor)) {
		doc.ele("Editor").txt(info.editor.join(", ")).up();
	}
	if (isNotEmpty(info.publisher)) {
		doc.ele("Publisher").txt(info.publisher.join(", ")).up();
	}
	if (isNotEmpty(info.imprint)) {
		doc.ele("Imprint").txt(info.imprint.join(", ")).up();
	}
	if (isNotEmpty(info.characters)) {
		doc.ele("Characters").txt(info.characters.join(", ")).up();
	}
	if (isNotEmpty(info.teams)) {
		doc.ele("Teams").txt(info.teams.join(", ")).up();
	}
	if (isNotEmpty(info.locations)) {
		doc.ele("Locations").txt(info.locations.join(", ")).up();
	}
	if (isNotEmpty(info.translator)) {
		doc.ele("Translator").txt(info.translator.join(", ")).up();
	}
	if (isNotEmpty(info.tags)) {
		doc.ele("Tags").txt(info.tags.join(", ")).up();
	}
	if (info.scanInformation !== undefined) {
		doc.ele("ScanInformation").txt(info.scanInformation).up();
	}
	for (const pageInfo of info.page ?? []) {
		const page = doc.ele("Page");
		page.ele("Image").txt(String(pageInfo.image)).up();
		page.ele("ImageWidth").txt(String(pageInfo.imageWidth)).up();
		page.ele("ImageHeight").txt(String(pageInfo.imageHeight)).up();
		page.up();
	}

	return doc.end({ prettyPrint: true });
};

export const galleryInfoToComicInfo = (info: GalleryInfo) => {
	return generateComicInfoXml({
		title: info.japanese_title ?? info.title,
		// series: info.japanese_title ?? info.title,
		number: 1,
		count: 1,
		volume: 1,
		date: new Date(info.datepublished ?? info.date),
		writer: info.artists?.map((artist) => artist.artist),
		publisher: info.groups?.map((group) => group.group),
		genre: info.type || "imageset",
		tags: info.tags?.map((tag) => tag.tag),
		web: [`https://hitomi.la/gallery/${info.id}.html`],
		pageCount: info.files.length,
		languageISO: info.language ? pageLangToBCP47(info.language) : undefined,
		format: info.type || "imageset",
		characters: info.characters?.map((char) => char.character),
		scanInformation: "Source: hitomi.la",
		seriesGroup: info.parodys?.map((parody) => parody.parody),
		ageRating: "R18+",
		page: info.files.map((file, index) => ({
			image: index + 1,
			imageWidth: file.width,
			imageHeight: file.height,
		})),
		localizedSeries: info.title,
	});
};

const pageLangToBCP47 = (key: string): string => {
	switch (key) {
		case "indonesian":
			return "id-ID";
		case "javanese":
			return "jv-ID";
		case "catalan":
			return "ca-ES";
		case "cebuano":
			return "ceb-PH";
		case "czech":
			return "cs-CZ";
		case "danish":
			return "da-DK";
		case "german":
			return "de-DE";
		case "estonian":
			return "et-EE";
		case "english":
			return "en-US";
		case "spanish":
			return "es-ES";
		case "esperanto":
			return "eo";
		case "french":
			return "fr-FR";
		case "hindi":
			return "hi-IN";
		case "icelandic":
			return "is-IS";
		case "italian":
			return "it-IT";
		case "latin":
			return "la";
		case "hungarian":
			return "hu-HU";
		case "dutch":
			return "nl-NL";
		case "norwegian":
			return "nb-NO";
		case "polish":
			return "pl-PL";
		case "portuguese":
			return "pt-PT";
		case "romanian":
			return "ro-RO";
		case "albanian":
			return "sq-AL";
		case "slovak":
			return "sk-SK";
		case "serbian":
			return "sr-Latn-RS";
		case "finnish":
			return "fi-FI";
		case "swedish":
			return "sv-SE";
		case "tagalog":
			return "tl-PH";
		case "vietnamese":
			return "vi-VN";
		case "turkish":
			return "tr-TR";
		case "greek":
			return "el-GR";
		case "bulgarian":
			return "bg-BG";
		case "mongolian":
			return "mn-MN";
		case "russian":
			return "ru-RU";
		case "ukrainian":
			return "uk-UA";
		case "hebrew":
			return "he-IL";
		case "arabic":
			return "ar-SA";
		case "persian":
			return "fa-IR";
		case "thai":
			return "th-TH";
		case "burmese":
			return "my-MM";
		case "korean":
			return "ko-KR";
		case "chinese":
			return "zh-Hans-CN";
		case "japanese":
			return "ja-JP";
		default:
			return "und";
	}
};
