import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadCheckpoint } from "../../../src/utils/checkpoint.js";

vi.mock("node:fs", () => {
	const readFileMock = vi.fn();
	return {
		default: {
			promises: {
				readFile: readFileMock,
			},
		},
		promises: {
			readFile: readFileMock,
		},
	};
});

vi.mock("../../../src/utils/dir.js", () => ({
	pathExists: vi.fn(),
}));

describe("loadCheckpoint", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns parsed numbers from file when file exists", async () => {
		const { pathExists } = await import("../../../src/utils/dir.js");
		const fs = await import("node:fs");
		vi.mocked(pathExists).mockResolvedValue(true);
		vi.mocked(fs.promises.readFile).mockResolvedValue("1\n2\n3\n");
		const result = await loadCheckpoint("test.txt");
		expect(result).toEqual([1, 2, 3]);
		expect(pathExists).toHaveBeenCalledWith("test.txt");
		expect(fs.promises.readFile).toHaveBeenCalledWith("test.txt", "utf8");
	});

	it("returns empty array when filePath is undefined", async () => {
		const result = await loadCheckpoint(undefined);
		expect(result).toEqual([]);
	});

	it("returns empty array when file does not exist", async () => {
		const { pathExists } = await import("../../../src/utils/dir.js");
		vi.mocked(pathExists).mockResolvedValue(false);
		const result = await loadCheckpoint("nonexistent.txt");
		expect(result).toEqual([]);
		expect(pathExists).toHaveBeenCalledWith("nonexistent.txt");
	});

	it("handles empty file content", async () => {
		const { pathExists } = await import("../../../src/utils/dir.js");
		const fs = await import("node:fs");
		vi.mocked(pathExists).mockResolvedValue(true);
		vi.mocked(fs.promises.readFile).mockResolvedValue("");
		const result = await loadCheckpoint("empty.txt");
		expect(result).toEqual([]);
	});

	it("handles single number", async () => {
		const { pathExists } = await import("../../../src/utils/dir.js");
		const fs = await import("node:fs");
		vi.mocked(pathExists).mockResolvedValue(true);
		vi.mocked(fs.promises.readFile).mockResolvedValue("42");
		const result = await loadCheckpoint("single.txt");
		expect(result).toEqual([42]);
	});

	it("handles numbers with extra whitespace", async () => {
		const { pathExists } = await import("../../../src/utils/dir.js");
		const fs = await import("node:fs");
		vi.mocked(pathExists).mockResolvedValue(true);
		vi.mocked(fs.promises.readFile).mockResolvedValue("  1  \n  2  \n  3  ");
		const result = await loadCheckpoint("whitespace.txt");
		expect(result).toEqual([1, 2, 3]);
	});

	it("parses negative numbers correctly", async () => {
		const { pathExists } = await import("../../../src/utils/dir.js");
		const fs = await import("node:fs");
		vi.mocked(pathExists).mockResolvedValue(true);
		vi.mocked(fs.promises.readFile).mockResolvedValue("-1\n-2\n-3");
		const result = await loadCheckpoint("negative.txt");
		expect(result).toEqual([-1, -2, -3]);
	});
});
