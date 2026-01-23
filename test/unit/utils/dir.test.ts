import { Readable, Writable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { outputDir, outputZip, pathExists } from "../../../src/utils/dir.js";
import { createLate } from "../../../src/utils/late.js";

vi.mock("node:fs", () => {
	const accessMock = vi.fn();
	const rmMock = vi.fn();
	const unlinkMock = vi.fn();
	const mkdirMock = vi.fn();
	const writeFileMock = vi.fn();
	const createWriteStreamMock = vi.fn();

	return {
		default: {
			promises: {
				access: accessMock,
				rm: rmMock,
				unlink: unlinkMock,
				mkdir: mkdirMock,
				writeFile: writeFileMock,
			},
			createWriteStream: createWriteStreamMock,
		},
		promises: {
			access: accessMock,
			rm: rmMock,
			unlink: unlinkMock,
			mkdir: mkdirMock,
			writeFile: writeFileMock,
		},
		createWriteStream: createWriteStreamMock,
	};
});

vi.mock("node:stream", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:stream")>();
	return {
		...actual,
		promises: {
			pipeline: vi.fn(),
		},
	};
});

vi.mock("yazl", () => ({
	default: {
		ZipFile: vi.fn(),
	},
}));

describe("pathExists", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns true when path exists", async () => {
		const fs = await import("node:fs");
		vi.mocked(fs.promises.access).mockResolvedValue(undefined);

		const result = await pathExists("/existing/path");

		expect(result).toBe(true);
		expect(fs.promises.access).toHaveBeenCalledWith("/existing/path");
	});

	it("returns false when path does not exist", async () => {
		const fs = await import("node:fs");
		vi.mocked(fs.promises.access).mockRejectedValue(new Error("ENOENT"));

		const result = await pathExists("/nonexistent/path");

		expect(result).toBe(false);
		expect(fs.promises.access).toHaveBeenCalledWith("/nonexistent/path");
	});

	it("returns false on permission denied", async () => {
		const fs = await import("node:fs");
		vi.mocked(fs.promises.access).mockRejectedValue(new Error("EACCES"));

		const result = await pathExists("/forbidden/path");

		expect(result).toBe(false);
	});

	it("handles multiple calls independently", async () => {
		const fs = await import("node:fs");

		vi.mocked(fs.promises.access).mockResolvedValueOnce(undefined);
		vi.mocked(fs.promises.access).mockRejectedValueOnce(new Error("ENOENT"));

		const result1 = await pathExists("/path1");
		const result2 = await pathExists("/path2");

		expect(result1).toBe(true);
		expect(result2).toBe(false);
	});
});

describe("outputDir", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns exists=true when directory exists", async () => {
		const fs = await import("node:fs");
		vi.mocked(fs.promises.access).mockResolvedValue(undefined);

		const result = await outputDir("/test/path");

		expect(result.exists).toBe(true);
	});

	it("returns exists=false when directory does not exist", async () => {
		const fs = await import("node:fs");
		vi.mocked(fs.promises.access).mockRejectedValue(new Error("ENOENT"));

		const result = await outputDir("/test/path");

		expect(result.exists).toBe(false);
	});

	it("remove calls fs.promises.rm with correct options", async () => {
		const fs = await import("node:fs");
		vi.mocked(fs.promises.access).mockRejectedValue(new Error("ENOENT"));
		vi.mocked(fs.promises.rm).mockResolvedValue(undefined);

		const result = await outputDir("/test/path");
		await result.remove();

		expect(fs.promises.rm).toHaveBeenCalledWith("/test/path", {
			recursive: true,
			force: true,
		});
	});
});

describe("outputZip", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns exists=true when file exists", async () => {
		const fs = await import("node:fs");
		vi.mocked(fs.promises.access).mockResolvedValue(undefined);

		const result = await outputZip("/test/file.zip");

		expect(result.exists).toBe(true);
	});

	it("returns exists=false when file does not exist", async () => {
		const fs = await import("node:fs");
		vi.mocked(fs.promises.access).mockRejectedValue(new Error("ENOENT"));

		const result = await outputZip("/test/file.zip");

		expect(result.exists).toBe(false);
	});

	it("remove calls fs.promises.unlink", async () => {
		const fs = await import("node:fs");
		vi.mocked(fs.promises.access).mockRejectedValue(new Error("ENOENT"));
		vi.mocked(fs.promises.unlink).mockResolvedValue(undefined);

		const result = await outputZip("/test/file.zip");
		await result.remove();

		expect(fs.promises.unlink).toHaveBeenCalledWith("/test/file.zip");
	});
});

describe("outputDir - create", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("creates directory before executing callback", async () => {
		const fs = await import("node:fs");
		vi.mocked(fs.promises.access).mockRejectedValue(new Error("ENOENT"));
		vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);

		const result = await outputDir("/test/path");
		await result.create(async () => {});

		expect(fs.promises.mkdir).toHaveBeenCalledWith("/test/path", { recursive: true });
	});

	it("provides descriptor with signal", async () => {
		const fs = await import("node:fs");
		vi.mocked(fs.promises.access).mockRejectedValue(new Error("ENOENT"));
		vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);

		const result = await outputDir("/test/path");

		await result.create(async (descriptor) => {
			expect(descriptor.signal).toBeInstanceOf(AbortSignal);
			expect(descriptor.signal.aborted).toBe(false);
			expect(descriptor.writeFile).toBeInstanceOf(Function);
			expect(descriptor.writeStream).toBeInstanceOf(Function);
			expect(descriptor.throwIfErrors).toBeInstanceOf(Function);
		});
	});

	it("writeFile creates file successfully", async () => {
		const fs = await import("node:fs");
		vi.mocked(fs.promises.access).mockRejectedValue(new Error("ENOENT"));
		vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
		vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

		const result = await outputDir("/test/path");

		await result.create(async (descriptor) => {
			descriptor.writeFile("file.txt", "content");
		});

		expect(fs.promises.writeFile).toHaveBeenCalledWith(
			expect.stringContaining("file.txt"),
			"content",
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		);
	});

	it("aborts signal when writeFile fails", async () => {
		const fs = await import("node:fs");
		vi.mocked(fs.promises.access).mockRejectedValue(new Error("ENOENT"));
		vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
		vi.mocked(fs.promises.writeFile).mockRejectedValue(new Error("Write failed"));

		const result = await outputDir("/test/path");

		const signal = createLate<AbortSignal>();
		const promise = result.create(async (descriptor) => {
			signal.set(descriptor.signal);
			descriptor.writeFile("test.txt", "content");
		});
		await expect(promise).rejects.toThrow(AggregateError);

		expect(signal.get().aborted).toBe(true);
	});

	it("aborts signal and collects errors when writeStream fails", async () => {
		const fs = await import("node:fs");
		const stream = await import("node:stream");
		vi.mocked(fs.promises.access).mockRejectedValue(new Error("ENOENT"));
		vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
		vi.mocked(stream.promises.pipeline).mockRejectedValue(new Error("Stream failed"));

		const mockWriteStream = Object.assign(new Writable(), {
			close: vi.fn(),
			bytesWritten: 0,
			path: "/test/path/stream.txt",
			pending: false,
		});
		vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream);

		const result = await outputDir("/test/path");

		const promise = result.create(async (descriptor) => {
			const readable = Readable.from(["data"]);
			descriptor.writeStream("stream.txt", readable);
		});
		await expect(promise).rejects.toThrow(AggregateError);
	});

	it("throwIfErrors throws AggregateError when errors exist", async () => {
		const fs = await import("node:fs");
		vi.mocked(fs.promises.access).mockRejectedValue(new Error("ENOENT"));
		vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
		vi.mocked(fs.promises.writeFile).mockRejectedValue(new Error("Write error"));

		const result = await outputDir("/test/path");

		const promise = result.create(async (descriptor) => {
			descriptor.writeFile("file.txt", "content");
			await descriptor.throwIfErrors();
		});
		await expect(promise).rejects.toThrow(AggregateError);
	});

	it("waits for all promises to complete", async () => {
		const fs = await import("node:fs");
		vi.mocked(fs.promises.access).mockRejectedValue(new Error("ENOENT"));
		vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);

		const completionOrder = createLate<number[]>();
		const order: number[] = [];

		vi.mocked(fs.promises.writeFile).mockImplementation(async () => {
			await Promise.resolve();
			order.push(order.length + 1);
		});

		const result = await outputDir("/test/path");

		await result.create(async (descriptor) => {
			descriptor.writeFile("file1.txt", "content1");
			descriptor.writeFile("file2.txt", "content2");
			descriptor.writeFile("file3.txt", "content3");
			completionOrder.set(order);
		});

		expect(completionOrder.get()).toEqual([1, 2, 3]);
		expect(fs.promises.writeFile).toHaveBeenCalledTimes(3);
	});

	it("collects all errors when multiple operations fail", async () => {
		const fs = await import("node:fs");
		vi.mocked(fs.promises.access).mockRejectedValue(new Error("ENOENT"));
		vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);

		const error1 = new Error("Error 1");
		const error2 = new Error("Error 2");
		const error3 = new Error("Error 3");

		vi.mocked(fs.promises.writeFile).mockRejectedValueOnce(error1).mockRejectedValueOnce(error2).mockRejectedValueOnce(error3);

		const result = await outputDir("/test/path");

		const promise = result.create(async (descriptor) => {
			descriptor.writeFile("file1.txt", "content1");
			descriptor.writeFile("file2.txt", "content2");
			descriptor.writeFile("file3.txt", "content3");
		});

		await expect(promise).rejects.toMatchObject({
			errors: expect.arrayContaining([
				expect.objectContaining({ message: expect.stringContaining("file1.txt") }),
				expect.objectContaining({ message: expect.stringContaining("file2.txt") }),
				expect.objectContaining({ message: expect.stringContaining("file3.txt") }),
			]),
		});
	});
});

describe("outputZip - create", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("provides AbortSignal to callback", async () => {
		const fs = await import("node:fs");
		vi.mocked(fs.promises.access).mockRejectedValue(new Error("ENOENT"));
		vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);

		const result = await outputZip("/test/file.zip");
		const signalProvided = createLate<AbortSignal>();
		const promise = result.create(async (descriptor) => {
			signalProvided.set(descriptor.signal);
		});

		await expect(promise).rejects.toThrow();
		expect(signalProvided.get()).toBeInstanceOf(AbortSignal);
	});
});
