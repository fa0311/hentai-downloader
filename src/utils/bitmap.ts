import RoaringBitmap32 from "roaring/RoaringBitmap32";

type UInt32ishList = ReadonlyArray<number>;

export function intersectAllGallerieIds(
  gallerieIdList: ReadonlyArray<UInt32ishList>,
): number[] {
  const n = gallerieIdList.length;
  if (n === 0) return [];

  for (const xs of gallerieIdList) if (xs.length === 0) return [];

  const lists = [...gallerieIdList].sort((a, b) => a.length - b.length);

  const toU32 = (xs: UInt32ishList): Uint32Array => {
    const out = new Uint32Array(xs.length);
    for (let i = 0; i < xs.length; i++) {
      const v = xs[i];
      if (!Number.isInteger(v) || v < 0 || v > 0xFFFF_FFFF) {
        throw new RangeError(`Invalid uint32 value: ${v}`);
      }
      out[i] = v >>> 0;
    }
    return out;
  };

  let acc = RoaringBitmap32.from(toU32(lists[0]));

  for (let i = 1; i < lists.length && !acc.isEmpty; i++) {
    const bm = RoaringBitmap32.from(toU32(lists[i]));
    acc.andInPlace(bm);
  }

  return acc.toArray();
}
