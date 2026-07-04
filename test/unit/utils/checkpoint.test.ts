import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadCheckpoint, toCheckpoint } from "../../../src/utils/checkpoint.js";
import { HentaiZodParseError } from "../../../src/utils/error.js";

const createReadStreamMock = vi.hoisted(() => vi.fn());

vi.mock("node:fs", () => ({
	default: {
		createReadStream: createReadStreamMock,
	},
	createReadStream: createReadStreamMock,
}));

vi.mock("../../../src/utils/dir.js", () => ({
	pathExists: vi.fn(),
}));

const readable = (content: string) => Readable.from([content]);

describe("loadCheckpoint", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("groups gallery IDs by hostname", async () => {
		const { pathExists } = await import("../../../src/utils/dir.js");
		vi.mocked(pathExists).mockResolvedValue(true);
		createReadStreamMock.mockReturnValue(
			readable([toCheckpoint(1, "example.com"), toCheckpoint(2, "example.com"), toCheckpoint(3, "content.example.com")].join("\n")),
		);

		const result = await loadCheckpoint("checkpoint.ndjson");

		expect(result).toEqual([
			{ galleryIds: [1, 2], hostname: "example.com" },
			{ galleryIds: [3], hostname: "content.example.com" },
		]);
		expect(pathExists).toHaveBeenCalledWith("checkpoint.ndjson");
		expect(createReadStreamMock).toHaveBeenCalledWith("checkpoint.ndjson", "utf8");
	});

	it("returns undefined when the checkpoint file does not exist", async () => {
		const { pathExists } = await import("../../../src/utils/dir.js");
		vi.mocked(pathExists).mockResolvedValue(false);

		const result = await loadCheckpoint("missing.ndjson");

		expect(result).toBeUndefined();
		expect(createReadStreamMock).not.toHaveBeenCalled();
	});

	it("returns an empty list for an empty checkpoint file", async () => {
		const { pathExists } = await import("../../../src/utils/dir.js");
		vi.mocked(pathExists).mockResolvedValue(true);
		createReadStreamMock.mockReturnValue(readable(""));

		const result = await loadCheckpoint("empty.ndjson");

		expect(result).toEqual([]);
	});

	it("rejects invalid checkpoint records", async () => {
		const { pathExists } = await import("../../../src/utils/dir.js");
		vi.mocked(pathExists).mockResolvedValue(true);
		createReadStreamMock.mockReturnValue(readable(JSON.stringify({ galleryId: 1, hostname: 2 })));

		await expect(loadCheckpoint("invalid.ndjson")).rejects.toThrow(HentaiZodParseError);
	});
});

describe("toCheckpoint", () => {
	it("serializes a gallery ID and hostname", () => {
		expect(toCheckpoint(1, "example.com")).toBe(JSON.stringify({ galleryId: 1, hostname: "example.com" }));
	});
});
