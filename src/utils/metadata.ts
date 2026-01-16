import { generateComicInfoXml } from "../cbz/metadata";
import type { GalleryInfo } from "../hitomi/gallery";

export const galleryInfoToComicInfo = (info: GalleryInfo) => {
	return generateComicInfoXml({
		title: info.title,
		series: info.title,
		number: 1,
		count: 1,
		volume: 1,
		date: new Date(info.datepublished ?? info.date),
		writer: info.artists?.map((artist) => artist.artist),
		publisher: info.groups?.map((group) => group.group),
		genre: info.type || "imageset",
		tags: info.tags.map((tag) => tag.tag),
		web: [`https://hitomi.la/gallery/${info.id}.html`],
		pageCount: info.files.length,
		languageISO: info.language,
		format: info.type || "imageset",
		characters: info.characters.map((char) => char.character),
		scanInformation: "Source: hitomi.la",
		seriesGroup: info.parodys?.map((parody) => parody.parody),
		ageRating: "R18+",
		page: info.files.map((file, index) => ({
			image: index + 1,
			imageWidth: file.width,
			imageHeight: file.height,
		})),
		localizedSeries: info.japanese_title,
	});
};
