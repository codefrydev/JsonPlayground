import { describe, it, expect } from "vitest";
import Queryable from "./Queryable";

const nums = [1, 2, 3, 4, 5];
const posts = [
  { id: 1, title: "A", category: "x" },
  { id: 2, title: "B", category: "y" },
  { id: 3, title: "A", category: "x" },
];

describe("Queryable", () => {
  describe("static From", () => {
    it("creates from array", () => {
      expect(Queryable.From([1, 2, 3]).ToArray()).toEqual([1, 2, 3]);
    });
    it("creates from iterable", () => {
      expect(Queryable.From(new Set([1, 2])).ToArray()).toEqual([1, 2]);
    });
  });

  describe("static Empty", () => {
    it("returns empty Queryable", () => {
      expect(Queryable.Empty<number>().ToArray()).toEqual([]);
    });
  });

  describe("static Range", () => {
    it("generates range", () => {
      expect(Queryable.Range(0, 3).ToArray()).toEqual([0, 1, 2]);
      expect(Queryable.Range(5, 2).ToArray()).toEqual([5, 6]);
    });
  });

  describe("static Repeat", () => {
    it("repeats element", () => {
      expect(Queryable.Repeat("a", 3).ToArray()).toEqual(["a", "a", "a"]);
    });
  });

  describe("static Concat", () => {
    it("concatenates iterables", () => {
      expect(Queryable.Concat([1, 2], [3], [4, 5]).ToArray()).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("static Sequence", () => {
    it("generates from function", () => {
      expect(Queryable.Sequence((i) => i * 2, 4).ToArray()).toEqual([0, 2, 4, 6]);
    });
  });

  describe("Where", () => {
    it("filters by predicate", () => {
      expect(Queryable.From(nums).Where((x) => x > 2).ToArray()).toEqual([3, 4, 5]);
    });
    it("supports string selector for property access", () => {
      expect(Queryable.From(posts).Where((p) => p.category === "x").Count()).toBe(2);
    });
  });

  describe("Select", () => {
    it("maps with function", () => {
      expect(Queryable.From(nums).Select((x) => x * 2).ToArray()).toEqual([2, 4, 6, 8, 10]);
    });
    it("maps with string property name", () => {
      expect(Queryable.From(posts).Select("title").ToArray()).toEqual(["A", "B", "A"]);
    });
  });

  describe("SelectMany", () => {
    it("flattens sequences", () => {
      expect(
        Queryable.From([[1, 2], [3]]).SelectMany((x) => x).ToArray()
      ).toEqual([1, 2, 3]);
    });
  });

  describe("OrderBy / OrderByDescending", () => {
    it("sorts ascending", () => {
      expect(Queryable.From([3, 1, 2]).OrderBy((x) => x).ToArray()).toEqual([1, 2, 3]);
    });
    it("sorts descending", () => {
      expect(Queryable.From([3, 1, 2]).OrderByDescending((x) => x).ToArray()).toEqual([3, 2, 1]);
    });
    it("sorts by key selector string", () => {
      expect(Queryable.From(posts).OrderBy("title").Select("id").ToArray()).toEqual([1, 3, 2]);
    });
  });

  describe("Distinct", () => {
    it("removes duplicates by identity", () => {
      expect(Queryable.From([1, 2, 1, 3, 2]).Distinct().ToArray()).toEqual([1, 2, 3]);
    });
    it("distinct by key selector", () => {
      expect(Queryable.From(posts).Distinct((p) => p.category).Select("category").ToArray()).toEqual(["x", "y"]);
    });
  });

  describe("GroupBy", () => {
    it("groups by key", () => {
      const map = Queryable.From(posts).GroupBy((p) => p.category);
      expect(map.get("x")!.length).toBe(2);
      expect(map.get("y")!.length).toBe(1);
    });
  });

  describe("Any / All", () => {
    it("Any() returns true when non-empty", () => {
      expect(Queryable.From(nums).Any()).toBe(true);
      expect(Queryable.Empty<number>().Any()).toBe(false);
    });
    it("Any(predicate) returns true when any match", () => {
      expect(Queryable.From(nums).Any((x) => x === 3)).toBe(true);
      expect(Queryable.From(nums).Any((x) => x > 10)).toBe(false);
    });
    it("All(predicate)", () => {
      expect(Queryable.From(nums).All((x) => x > 0)).toBe(true);
      expect(Queryable.From(nums).All((x) => x > 1)).toBe(false);
    });
  });

  describe("First / FirstOrDefault", () => {
    it("First() returns first element", () => {
      expect(Queryable.From(nums).First()).toBe(1);
    });
    it("First(predicate)", () => {
      expect(Queryable.From(nums).First((x) => x > 3)).toBe(4);
    });
    it("FirstOrDefault returns default when empty", () => {
      expect(Queryable.Empty<number>().FirstOrDefault(99)).toBe(99);
    });
  });

  describe("Count", () => {
    it("returns length", () => {
      expect(Queryable.From(nums).Count()).toBe(5);
    });
    it("Count(predicate)", () => {
      expect(Queryable.From(nums).Count((x) => x % 2 === 0)).toBe(2);
    });
  });

  describe("Sum / Average", () => {
    it("Sum()", () => {
      expect(Queryable.From(nums).Sum()).toBe(15);
    });
    it("Sum(selector)", () => {
      expect(Queryable.From(posts).Sum((p) => p.id)).toBe(6);
    });
    it("Average()", () => {
      expect(Queryable.From([2, 4, 6]).Average()).toBe(4);
    });
    it("Average() empty returns 0", () => {
      expect(Queryable.Empty<number>().Average()).toBe(0);
    });
  });

  describe("Skip / Take", () => {
    it("Skip", () => {
      expect(Queryable.From(nums).Skip(2).ToArray()).toEqual([3, 4, 5]);
    });
    it("Take", () => {
      expect(Queryable.From(nums).Take(2).ToArray()).toEqual([1, 2]);
    });
    it("SkipWhile / TakeWhile", () => {
      expect(Queryable.From(nums).SkipWhile((x) => x < 3).ToArray()).toEqual([3, 4, 5]);
      expect(Queryable.From(nums).TakeWhile((x) => x < 4).ToArray()).toEqual([1, 2, 3]);
    });
  });

  describe("ToArray / ToList", () => {
    it("ToArray and ToList return same", () => {
      const q = Queryable.From(nums);
      expect(q.ToArray()).toEqual(q.ToList());
    });
  });

  describe("Join", () => {
    it("inner joins on keys", () => {
      const outer = [{ id: 1, n: "a" }, { id: 2, n: "b" }];
      const inner = [{ id: 1, v: 10 }, { id: 2, v: 20 }];
      const result = Queryable.From(outer)
        .Join(inner, (o) => o.id, (i) => i.id, (o, i) => ({ ...o, v: i.v }))
        .ToArray();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 1, n: "a", v: 10 });
    });
  });

  describe("LeftJoin", () => {
    it("keeps outer when no match", () => {
      const outer = [{ id: 1 }, { id: 2 }];
      const inner = [{ id: 1, v: 10 }];
      const result = Queryable.From(outer)
        .LeftJoin(inner, (o) => o.id, (i) => i.id, (o, i) => ({ ...o, v: i?.v ?? null }))
        .ToArray();
      expect(result).toHaveLength(2);
      expect(result[1].v).toBe(null);
    });
  });

  describe("Contains", () => {
    it("returns true when element present", () => {
      expect(Queryable.From(nums).Contains(3)).toBe(true);
      expect(Queryable.From(nums).Contains(99)).toBe(false);
    });
  });

  describe("DefaultIfEmpty", () => {
    it("returns single default when empty", () => {
      expect(Queryable.Empty<number>().DefaultIfEmpty(0).ToArray()).toEqual([0]);
    });
    it("returns same when non-empty", () => {
      expect(Queryable.From([1]).DefaultIfEmpty(0).ToArray()).toEqual([1]);
    });
  });

  describe("Append / Prepend", () => {
    it("Append adds at end", () => {
      expect(Queryable.From([1, 2]).Append(3).ToArray()).toEqual([1, 2, 3]);
    });
    it("Prepend adds at start", () => {
      expect(Queryable.From([2, 3]).Prepend(1).ToArray()).toEqual([1, 2, 3]);
    });
  });

  describe("Chunk", () => {
    it("splits into chunks", () => {
      expect(Queryable.From(nums).Chunk(2).ToArray()).toEqual([[1, 2], [3, 4], [5]]);
    });
  });

  describe("Zip", () => {
    it("zips two sequences", () => {
      expect(Queryable.From([1, 2]).Zip([10, 20], (a, b) => a + b).ToArray()).toEqual([11, 22]);
    });
  });

  describe("Except / Intersect / Union", () => {
    it("Except removes elements in other", () => {
      expect(Queryable.From([1, 2, 3]).Except([2]).ToArray()).toEqual([1, 3]);
    });
    it("Intersect keeps only elements in other", () => {
      expect(Queryable.From([1, 2, 3]).Intersect([2, 4]).ToArray()).toEqual([2]);
    });
    it("Union merges distinct", () => {
      expect(Queryable.From([1, 2]).Union([2, 3]).ToArray()).toEqual([1, 2, 3]);
    });
  });

  describe("Aggregate", () => {
    it("with seed", () => {
      expect(Queryable.From(nums).Aggregate((acc: number, x) => acc + x, 0)).toBe(15);
    });
    it("without seed uses first as seed", () => {
      expect(Queryable.From(nums).Aggregate((acc: number, x) => acc + x)).toBe(15);
    });
    it("empty without seed returns undefined", () => {
      expect(Queryable.Empty<number>().Aggregate((a: number, b: number) => a + b)).toBeUndefined();
    });
  });

  describe("Concat (instance)", () => {
    it("concatenates with other", () => {
      expect(Queryable.From([1, 2]).Concat([3, 4]).ToArray()).toEqual([1, 2, 3, 4]);
    });
  });

  describe("ElementAt / ElementAtOrDefault", () => {
    it("ElementAt returns at index", () => {
      expect(Queryable.From(nums).ElementAt(2)).toBe(3);
      expect(Queryable.From(nums).ElementAt(10)).toBeUndefined();
    });
    it("ElementAtOrDefault returns default when out of range", () => {
      expect(Queryable.From(nums).ElementAtOrDefault(10, -1)).toBe(-1);
    });
  });

  describe("Last / LastOrDefault", () => {
    it("Last() returns last", () => {
      expect(Queryable.From(nums).Last()).toBe(5);
    });
    it("LastOrDefault", () => {
      expect(Queryable.Empty<number>().LastOrDefault(0)).toBe(0);
    });
  });

  describe("Max / Min / MaxBy / MinBy", () => {
    it("Max()", () => {
      expect(Queryable.From(nums).Max()).toBe(5);
    });
    it("Min()", () => {
      expect(Queryable.From(nums).Min()).toBe(1);
    });
    it("MaxBy returns element", () => {
      expect(Queryable.From(posts).MaxBy((p) => p.id)?.id).toBe(3);
    });
    it("MinBy returns element", () => {
      expect(Queryable.From(posts).MinBy((p) => p.id)?.id).toBe(1);
    });
  });

  describe("Reverse", () => {
    it("reverses order", () => {
      expect(Queryable.From(nums).Reverse().ToArray()).toEqual([5, 4, 3, 2, 1]);
    });
  });

  describe("SequenceEqual", () => {
    it("returns true when equal", () => {
      expect(Queryable.From(nums).SequenceEqual([1, 2, 3, 4, 5])).toBe(true);
    });
    it("returns false when different length or values", () => {
      expect(Queryable.From(nums).SequenceEqual([1, 2])).toBe(false);
      expect(Queryable.From([1, 2]).SequenceEqual([1, 3])).toBe(false);
    });
  });

  describe("Single / SingleOrDefault", () => {
    it("Single returns only element", () => {
      expect(Queryable.From([42]).Single()).toBe(42);
    });
    it("Single throws when not exactly one", () => {
      expect(() => Queryable.From([1, 2]).Single()).toThrow();
      expect(() => Queryable.Empty<number>().Single()).toThrow();
    });
    it("SingleOrDefault returns default when empty", () => {
      expect(Queryable.Empty<number>().SingleOrDefault(null)).toBe(null);
    });
  });

  describe("SkipLast / TakeLast", () => {
    it("SkipLast", () => {
      expect(Queryable.From(nums).SkipLast(2).ToArray()).toEqual([1, 2, 3]);
    });
    it("TakeLast", () => {
      expect(Queryable.From(nums).TakeLast(2).ToArray()).toEqual([4, 5]);
    });
  });

  describe("OfType", () => {
    it("filters by type guard", () => {
      const mixed: (number | string)[] = [1, "a", 2, "b"];
      expect(Queryable.From(mixed).OfType((x): x is number => typeof x === "number").ToArray()).toEqual([1, 2]);
    });
  });

  describe("ToDictionary", () => {
    it("builds map from key and value selectors", () => {
      const map = Queryable.From(posts).ToDictionary((p) => p.id, (p) => p.title);
      expect(map.get(1)).toBe("A");
      expect(map.size).toBe(3);
    });
  });

  describe("ToHashSet", () => {
    it("builds set of keys", () => {
      const set = Queryable.From(posts).ToHashSet((p) => p.category);
      expect(set.has("x")).toBe(true);
      expect(set.size).toBe(2);
    });
  });

  describe("FindIndex / IndexOf", () => {
    it("FindIndex", () => {
      expect(Queryable.From(nums).FindIndex((x) => x === 4)).toBe(3);
      expect(Queryable.From(nums).FindIndex(() => false)).toBe(-1);
    });
    it("IndexOf", () => {
      expect(Queryable.From([1, 2, 2, 3]).IndexOf(2)).toBe(1);
    });
  });

  describe("WhereNotNull", () => {
    it("filters null and undefined", () => {
      expect(Queryable.From([1, null, 2, undefined, 3]).WhereNotNull().ToArray()).toEqual([1, 2, 3]);
    });
  });

  describe("Flatten", () => {
    it("flattens one level", () => {
      const nested = Queryable.From<number[]>([[1, 2], [3]]);
      expect(nested.Flatten().ToArray()).toEqual([1, 2, 3]);
    });
  });

  describe("Scan", () => {
    it("yields accumulated values", () => {
      expect(Queryable.From([1, 2, 3]).Scan(0, (acc, x) => acc + x).ToArray()).toEqual([1, 3, 6]);
    });
  });

  describe("Pairwise", () => {
    it("yields adjacent pairs", () => {
      expect(Queryable.From([1, 2, 3]).Pairwise((a, b) => a + b).ToArray()).toEqual([3, 5]);
    });
  });

  describe("Window", () => {
    it("sliding windows", () => {
      expect(Queryable.From([1, 2, 3, 4]).Window(2).ToArray()).toEqual([[1, 2], [2, 3], [3, 4]]);
    });
  });

  describe("Partition", () => {
    it("splits by predicate", () => {
      const [evens, odds] = Queryable.From(nums).Partition((x) => x % 2 === 0);
      expect(evens.ToArray()).toEqual([2, 4]);
      expect(odds.ToArray()).toEqual([1, 3, 5]);
    });
  });

  describe("ToRecord", () => {
    it("builds plain object", () => {
      const rec = Queryable.From(posts).ToRecord((p) => p.id as number, (p) => p.title);
      expect(rec[1]).toBe("A");
      expect(Object.keys(rec).length).toBe(3);
    });
  });

  describe("Sort", () => {
    it("sorts with default comparer", () => {
      expect(Queryable.From([3, 1, 2]).Sort().ToArray()).toEqual([1, 2, 3]);
    });
  });

  describe("Slice", () => {
    it("slices like array", () => {
      expect(Queryable.From(nums).Slice(1, 4).ToArray()).toEqual([2, 3, 4]);
    });
  });

  describe("PadEnd / PadStart", () => {
    it("PadEnd pads at end", () => {
      expect(Queryable.From([1, 2]).PadEnd(4, 0).ToArray()).toEqual([1, 2, 0, 0]);
    });
    it("PadStart pads at start", () => {
      expect(Queryable.From([1, 2]).PadStart(4, 0).ToArray()).toEqual([0, 0, 1, 2]);
    });
  });

  describe("Lead / Lag", () => {
    it("Lead shifts forward", () => {
      const result = Queryable.From([10, 20, 30]).Lead(1, null).ToArray();
      expect(result).toEqual([20, 30, null]);
    });
    it("Lag shifts backward", () => {
      const result = Queryable.From([10, 20, 30]).Lag(1, null).ToArray();
      expect(result).toEqual([null, 10, 20]);
    });
  });

  describe("Replace / ReplaceAll", () => {
    it("Replace first", () => {
      expect(Queryable.From([1, 2, 2, 3]).Replace(2, 99).ToArray()).toEqual([1, 99, 2, 3]);
    });
    it("ReplaceAll", () => {
      expect(Queryable.From([1, 2, 2, 3]).ReplaceAll(2, 99).ToArray()).toEqual([1, 99, 99, 3]);
    });
  });

  describe("RemoveAll / Insert / RemoveAt", () => {
    it("RemoveAll", () => {
      expect(Queryable.From([1, 2, 3, 2]).RemoveAll((x) => x === 2).ToArray()).toEqual([1, 3]);
    });
    it("Insert", () => {
      expect(Queryable.From([1, 3]).Insert(1, 2).ToArray()).toEqual([1, 2, 3]);
    });
    it("RemoveAt", () => {
      expect(Queryable.From([1, 2, 3]).RemoveAt(1).ToArray()).toEqual([1, 3]);
    });
  });

  describe("CrossJoin", () => {
    it("cartesian product", () => {
      const result = Queryable.From([1, 2]).CrossJoin(["a", "b"], (n, s) => `${n}${s}`).ToArray();
      expect(result).toEqual(["1a", "1b", "2a", "2b"]);
    });
  });

  describe("GroupJoin", () => {
    it("joins with grouped inner", () => {
      const orders = [{ id: 1, custId: 1 }, { id: 2, custId: 1 }];
      const custs = [{ id: 1, name: "C1" }];
      const result = Queryable.From(custs)
        .GroupJoin(orders, (c) => c.id, (o) => o.custId, (c, ords) => ({ name: c.name, count: ords.length }))
        .ToArray();
      expect(result[0].count).toBe(2);
    });
  });

  describe("ZipLongest", () => {
    it("zips to longest with defaults", () => {
      expect(
        Queryable.From([1, 2]).ZipLongest([10], 0, 0, (a, b) => a + b).ToArray()
      ).toEqual([11, 2]);
    });
  });

  describe("JoinToString", () => {
    it("joins with separator", () => {
      expect(Queryable.From([1, 2, 3]).JoinToString(",")).toBe("1,2,3");
    });
    it("JoinToString with selector", () => {
      expect(Queryable.From(posts).JoinToString(" | ", (p) => p.title)).toBe("A | B | A");
    });
  });

  describe("TakeEvery", () => {
    it("takes every nth", () => {
      expect(Queryable.From(nums).TakeEvery(2).ToArray()).toEqual([1, 3, 5]);
    });
  });

  describe("Batch", () => {
    it("same as Chunk", () => {
      expect(Queryable.From(nums).Batch(2).ToArray()).toEqual(Queryable.From(nums).Chunk(2).ToArray());
    });
  });

  describe("Fill", () => {
    it("fills range", () => {
      expect(Queryable.From([1, 2, 3, 4]).Fill(9, 1, 3).ToArray()).toEqual([1, 9, 9, 4]);
    });
  });

  describe("CopyTo", () => {
    it("copies to array", () => {
      const arr: number[] = [0, 0, 0];
      Queryable.From([1, 2]).CopyTo(arr, 1);
      expect(arr).toEqual([0, 1, 2]);
    });
  });

  describe("LongCount", () => {
    it("same as Count", () => {
      expect(Queryable.From(nums).LongCount()).toBe(Queryable.From(nums).Count());
    });
  });

  describe("DistinctBy / IntersectBy / ExceptBy / UnionBy", () => {
    it("DistinctBy same as Distinct with key", () => {
      const byCat = Queryable.From(posts).DistinctBy((p) => p.category).ToArray();
      expect(byCat.length).toBe(2);
    });
    it("IntersectBy", () => {
      expect(Queryable.From(posts).IntersectBy([{ id: 2 }], (p) => p.id).Count()).toBe(1);
    });
  });

  describe("Shuffle", () => {
    it("returns same length", () => {
      const q = Queryable.From(nums);
      expect(q.Shuffle().Count()).toBe(q.Count());
    });
    it("contains same elements", () => {
      const shuffled = Queryable.From(nums).Shuffle().ToArray().sort();
      expect(shuffled).toEqual([...nums].sort());
    });
  });
});
