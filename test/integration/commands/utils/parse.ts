import { parseSourceUrl } from "../../../../src/source/url";

export const parse = (url: string) => {
	const parsed = parseSourceUrl(url);
	if (parsed.discriminator === "gallery") {
		return parsed.galleryId;
	} else {
		throw new Error("Invalid source URL");
	}
};
