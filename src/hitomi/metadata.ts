import { create } from "xmlbuilder2";
import { GalleryInfo } from "./gallery";

const webDomain = "hitomi.la";

export const generateComicInfoXml = (galleryInfo: GalleryInfo): string => {
	const doc = create({ version: "1.0", encoding: "utf-8" }).ele("ComicInfo");

	// Basic information
	doc
		.ele("Title")
		.txt(galleryInfo.title || "")
		.up();
	doc
		.ele("Series")
		.txt(galleryInfo.title || "")
		.up();
	doc.ele("Number").txt("1").up();
	doc.ele("Count").txt("1").up();
	doc.ele("Volume").txt("1").up();

	const publishedDate = new Date(galleryInfo.datepublished || galleryInfo.date);

	// published date
	doc.ele("Year").txt(String(publishedDate.getFullYear())).up();
	doc
		.ele("Month")
		.txt(String(publishedDate.getMonth() + 1))
		.up();
	doc.ele("Day").txt(String(publishedDate.getDate())).up();

	// Authors
	const artists = galleryInfo.artists?.map((artist) => artist.artist).filter((name) => name.trim() !== "") || [];

	const groups = galleryInfo.groups?.map((group) => group.group).filter((name) => name.trim() !== "") || [];

	if (artists.length > 0) {
		doc.ele("Writer").txt(artists.concat(groups).join(", ")).up();
	}

	if (groups.length > 0) {
		doc.ele("Publisher").txt(groups.join(", ")).up();
	}

	doc
		.ele("Genre")
		.txt(galleryInfo.type || "imageset")
		.up();

	const tags = galleryInfo.tags?.map((tag) => tag.tag).filter((tag) => tag.trim() !== "") || [];
	doc.ele("Tags").txt(tags.join(", ")).up();

	doc.ele("Web").txt(`https://${webDomain}${galleryInfo.galleryurl}`).up();

	doc.ele("PageCount").txt(String(galleryInfo.files.length)).up();
	doc
		.ele("LanguageISO")
		.txt(galleryInfo.language || "")
		.up();
	doc
		.ele("Format")
		.txt(galleryInfo.type || "imageset")
		.up();

	const characterNames =
		galleryInfo.characters?.map((char) => char.character).filter((name) => name.trim() !== "") || [];
	doc.ele("Characters").txt(characterNames.join(", ")).up();

	doc.ele("ScanInformation").txt("Source: hitomi.la").up();

	const parodys = galleryInfo.parodys?.map((parody) => parody.parody).filter((name) => name.trim() !== "") || [];
	doc.ele("SeriesGroup").txt(parodys.join(", ")).up();

	doc.ele("AgeRating").txt("R18+").up();

	for (let i = 0; i < galleryInfo.files.length; i++) {
		const file = galleryInfo.files[i];
		const page = doc.ele("Page");
		page
			.ele("Image")
			.txt(String(i + 1))
			.up();
		page.ele("ImageWidth").txt(String(file.width)).up();
		page.ele("ImageHeight").txt(String(file.height)).up();
		page.up();
	}

	if (galleryInfo.japanese_title) {
		doc.ele("LocalizedSeries").txt(galleryInfo.japanese_title).up();
	}

	return doc.end({ prettyPrint: true });
};
