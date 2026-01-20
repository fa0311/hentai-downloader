import { describe, expect, it } from "vitest";
import { fillFilenamePlaceholders, fillGalleryPlaceholders, isZipFile } from "../../src/download";
import type { GalleryInfo } from "../../src/hitomi/gallery";

describe("fillGalleryPlaceholders", () => {
	const mockGallery: GalleryInfo = {
		id: 12345,
		title: "Test Gallery",
		type: "doujinshi",
		language: "japanese",
		date: new Date("2024-03-15T10:30:00Z"),
		datepublished: "2024-03-15",
		galleryurl: "https://example.com/gallery/12345",
		files: [],
		scene_indexes: [],
		languages: [],
	};

	it("replaces id placeholder", () => {
		const result = fillGalleryPlaceholders("gallery-{id}", mockGallery);
		expect(result).toBe("gallery-12345");
	});

	it("replaces title placeholder", () => {
		const result = fillGalleryPlaceholders("{title}", mockGallery);
		expect(result).toBe("Test Gallery");
	});

	it("replaces type placeholder", () => {
		const result = fillGalleryPlaceholders("{type}", mockGallery);
		expect(result).toBe("doujinshi");
	});

	it("replaces language placeholder", () => {
		const result = fillGalleryPlaceholders("{language}", mockGallery);
		expect(result).toBe("japanese");
	});

	it("replaces date placeholders with zero padding", () => {
		const gallery: GalleryInfo = {
			...mockGallery,
			date: new Date("2024-01-05"),
		};
		const result = fillGalleryPlaceholders("{year}-{month}-{day}", gallery);
		expect(result).toBe("2024-01-05");
	});

	it("replaces multiple placeholders", () => {
		const result = fillGalleryPlaceholders("{type}/{id}-{title}", mockGallery);
		expect(result).toBe("doujinshi/12345-Test Gallery");
	});

	it("uses date when datepublished is missing", () => {
		const gallery: GalleryInfo = {
			...mockGallery,
			datepublished: undefined,
		};
		const result = fillGalleryPlaceholders("{year}", gallery);
		expect(result).toMatch(/^\d{4}$/);
	});

	it("replaces all occurrences of same placeholder", () => {
		const result = fillGalleryPlaceholders("{id}-{id}-{id}", mockGallery);
		expect(result).toBe("12345-12345-12345");
	});
});

describe("fillFilenamePlaceholders", () => {
	const mockFile = {
		name: "image.jpg",
		hash: "abc123",
		width: 1920,
		height: 1080,
	};

	it("replaces no placeholder with zero padding", () => {
		const result = fillFilenamePlaceholders("{no}", 0, 10, mockFile);
		expect(result).toBe("01");
	});

	it("pads no placeholder based on total count", () => {
		const result = fillFilenamePlaceholders("{no}", 99, 1000, mockFile);
		expect(result).toBe("0100");
	});

	it("replaces index placeholder", () => {
		const result = fillFilenamePlaceholders("{index}", 5, 10, mockFile);
		expect(result).toBe("5");
	});

	it("replaces name placeholder", () => {
		const result = fillFilenamePlaceholders("{name}", 0, 10, mockFile);
		expect(result).toBe("image");
	});

	it("replaces ext placeholder", () => {
		const result = fillFilenamePlaceholders("{ext}", 0, 10, mockFile);
		expect(result).toBe(".jpg");
	});

	it("replaces width and height placeholders", () => {
		const result = fillFilenamePlaceholders("{width}x{height}", 0, 10, mockFile);
		expect(result).toBe("1920x1080");
	});

	it("replaces hash placeholder", () => {
		const result = fillFilenamePlaceholders("{hash}", 0, 10, mockFile);
		expect(result).toBe("abc123");
	});

	it("replaces multiple placeholders", () => {
		const result = fillFilenamePlaceholders("{no}_{name}{ext}", 5, 100, mockFile);
		expect(result).toBe("006_image.jpg");
	});

	it("handles missing dimensions with 'unknown'", () => {
		const videoFile = { name: "video.mp4" };
		const result = fillFilenamePlaceholders("{name}-{width}x{height}{ext}", 0, 10, videoFile);
		expect(result).toBe("video-unknownxunknown.mp4");
	});

	it("handles missing hash with 'unknown'", () => {
		const fileNoHash = { name: "file.txt", width: 100, height: 100 };
		const result = fillFilenamePlaceholders("{hash}", 0, 10, fileNoHash);
		expect(result).toBe("unknown");
	});

	it("replaces all occurrences of same placeholder", () => {
		const result = fillFilenamePlaceholders("{no}-{no}", 5, 100, mockFile);
		expect(result).toBe("006-006");
	});
});

describe("isZipFile", () => {
	it("returns true for .zip extension", () => {
		expect(isZipFile("archive.zip")).toBe(true);
	});

	it("returns true for .cbz extension", () => {
		expect(isZipFile("comic.cbz")).toBe(true);
	});

	it("is case insensitive", () => {
		expect(isZipFile("ARCHIVE.ZIP")).toBe(true);
		expect(isZipFile("COMIC.CBZ")).toBe(true);
		expect(isZipFile("file.ZiP")).toBe(true);
		expect(isZipFile("file.CbZ")).toBe(true);
	});

	it("returns false for other extensions", () => {
		expect(isZipFile("file.txt")).toBe(false);
		expect(isZipFile("image.jpg")).toBe(false);
		expect(isZipFile("archive.rar")).toBe(false);
	});

	it("returns false for no extension", () => {
		expect(isZipFile("filename")).toBe(false);
	});

	it("returns false for empty string", () => {
		expect(isZipFile("")).toBe(false);
	});
});
