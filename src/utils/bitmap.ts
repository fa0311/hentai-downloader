import RoaringBitmap32 from "roaring/RoaringBitmap32";

export const intersectUint32Collections = (collections: number[][]): number[] => {
	if (collections.length === 0) return [];

	const sorted = collections.toSorted((a, b) => a.length - b.length);
	const [first, ...rest] = sorted;

	if (first.length === 0) return [];

	const accumulator = RoaringBitmap32.from(first);

	for (const value of rest) {
		const bitmap = RoaringBitmap32.from(value);
		accumulator.andInPlace(bitmap);
		if (accumulator.isEmpty) return [];
	}

	return accumulator.toArray();
};
