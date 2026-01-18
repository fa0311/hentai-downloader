import { describe, expect, it } from "vitest";
import { differenceUint32Collections, intersectUint32Collections } from "../../src/utils/bitmap";

describe("intersectUint32Collections", () => {
	it("returns empty array for empty input", () => {
		const result = intersectUint32Collections([]);
		expect(result).toEqual([]);
	});

	it("returns same array for single collection", () => {
		const result = intersectUint32Collections([[1, 2, 3]]);
		expect(result).toEqual([1, 2, 3]);
	});

	it("returns intersection of two collections", () => {
		const result = intersectUint32Collections([
			[1, 2, 3, 4],
			[2, 3, 4, 5],
		]);
		expect(result).toEqual([2, 3, 4]);
	});

	it("returns empty array when no common elements", () => {
		const result = intersectUint32Collections([
			[1, 2, 3],
			[4, 5, 6],
		]);
		expect(result).toEqual([]);
	});

	it("returns intersection of multiple collections", () => {
		const result = intersectUint32Collections([
			[1, 2, 3, 4, 5],
			[2, 3, 4, 5, 6],
			[3, 4, 5, 6, 7],
		]);
		expect(result).toEqual([3, 4, 5]);
	});

	it("returns empty array when any collection is empty", () => {
		const result = intersectUint32Collections([[], [1, 2, 3]]);
		expect(result).toEqual([]);
	});
});

describe("differenceUint32Collections", () => {
	it("returns empty array for empty input", () => {
		const result = differenceUint32Collections([]);
		expect(result).toEqual([]);
	});

	it("returns same array for single collection", () => {
		const result = differenceUint32Collections([[1, 2, 3]]);
		expect(result).toEqual([1, 2, 3]);
	});

	it("returns difference of two collections", () => {
		const result = differenceUint32Collections([
			[1, 2, 3, 4],
			[2, 3],
		]);
		expect(result).toEqual([1, 4]);
	});

	it("returns empty array when all elements removed", () => {
		const result = differenceUint32Collections([
			[1, 2, 3],
			[1, 2, 3],
		]);
		expect(result).toEqual([]);
	});

	it("returns difference with multiple collections", () => {
		const result = differenceUint32Collections([
			[1, 2, 3, 4, 5, 6],
			[2, 3],
			[4, 5],
		]);
		expect(result).toEqual([1, 6]);
	});

	it("returns same array when no overlap", () => {
		const result = differenceUint32Collections([
			[1, 2, 3],
			[4, 5, 6],
		]);
		expect(result).toEqual([1, 2, 3]);
	});
});
