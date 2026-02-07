/* LINQ-style Queryable for JavaScript/TypeScript — C#-friendly API */

type Selector<T, R = unknown> = ((x: T) => R) | string | null;
type Predicate<T> = ((x: T) => boolean) | null;

export default class Queryable<T = unknown> {
  private _arr: T[];

  constructor(iterable: Iterable<T> = []) {
    this._arr = Array.from(iterable);
  }

  static From<R>(iterable: Iterable<R>): Queryable<R> {
    return new Queryable(iterable);
  }

  static Empty<R>(): Queryable<R> {
    return new Queryable<R>([]);
  }

  static Range(start: number, count: number): Queryable<number> {
    const out: number[] = [];
    for (let i = 0; i < count; i++) out.push(start + i);
    return new Queryable(out);
  }

  static Repeat<R>(element: R, count: number): Queryable<R> {
    return new Queryable(Array(count).fill(element));
  }

  static Concat<R>(...iterables: Iterable<R>[]): Queryable<R> {
    const out: R[] = [];
    for (const it of iterables) out.push(...Array.from(it));
    return new Queryable(out);
  }

  static Sequence<R>(generator: (index: number) => R, count: number): Queryable<R> {
    const out: R[] = [];
    for (let i = 0; i < count; i++) out.push(generator(i));
    return new Queryable(out);
  }

  private static _toFn<T, R>(selector: Selector<T, R>): (x: T) => R {
    if (selector == null) return (x) => x as unknown as R;
    if (typeof selector === 'function') return selector as (x: T) => R;
    if (typeof selector === 'string')
      return (x) => (x == null ? undefined : (x as Record<string, unknown>)[selector]) as R;
    throw new TypeError('selector must be function, string, or null');
  }

  private static _compare(a: unknown, b: unknown): number {
    if (a === b) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
    return (a as number) > (b as number) ? 1 : -1;
  }

  Where(predicate: Predicate<T> | ((x: T) => boolean)): Queryable<T> {
    const p = Queryable._toFn(predicate ?? (() => true));
    return new Queryable(this._arr.filter((x) => Boolean(p(x))));
  }

  Select<R>(selector: Selector<T, R>): Queryable<R> {
    const s = Queryable._toFn(selector);
    return new Queryable(this._arr.map(s));
  }

  SelectMany<R>(selector: Selector<T, Iterable<R> | null | undefined>): Queryable<R> {
    const s = Queryable._toFn(selector);
    return new Queryable(
      this._arr.flatMap((x) => Array.from(s(x) ?? []))
    );
  }

  OrderBy(keySelector: Selector<T>): Queryable<T> {
    const ks = Queryable._toFn(keySelector);
    const copy = [...this._arr];
    copy.sort((a, b) => Queryable._compare(ks(a), ks(b)));
    return new Queryable(copy);
  }

  OrderByDescending(keySelector: Selector<T>): Queryable<T> {
    const ks = Queryable._toFn(keySelector);
    const copy = [...this._arr];
    copy.sort((a, b) => -Queryable._compare(ks(a), ks(b)));
    return new Queryable(copy);
  }

  ThenBy(keySelector: Selector<T>): Queryable<T> {
    const ks = Queryable._toFn(keySelector);
    const copy = [...this._arr];
    copy.sort((a, b) => Queryable._compare(ks(a), ks(b)));
    return new Queryable(copy);
  }

  ThenByDescending(keySelector: Selector<T>): Queryable<T> {
    const ks = Queryable._toFn(keySelector);
    const copy = [...this._arr];
    copy.sort((a, b) => -Queryable._compare(ks(a), ks(b)));
    return new Queryable(copy);
  }

  Distinct(keySelector?: Selector<T>): Queryable<T> {
    const ks = Queryable._toFn(keySelector ?? ((x) => x as unknown));
    const seen = new Map<unknown, T>();
    for (const item of this._arr) {
      const key = ks(item);
      if (!seen.has(key)) seen.set(key, item);
    }
    return new Queryable(Array.from(seen.values()));
  }

  GroupBy<K>(keySelector: Selector<T, K>): Map<K, T[]> {
    const ks = Queryable._toFn(keySelector);
    const map = new Map<K, T[]>();
    for (const item of this._arr) {
      const key = ks(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }

  Any(predicate?: Predicate<T> | ((x: T) => boolean)): boolean {
    if (predicate == null) return this._arr.length > 0;
    return this._arr.some(Queryable._toFn(predicate) as (x: T) => boolean);
  }

  All(predicate: (x: T) => boolean): boolean {
    return this._arr.every(Queryable._toFn(predicate) as (x: T) => boolean);
  }

  First(predicate?: Predicate<T> | ((x: T) => boolean)): T | undefined {
    if (predicate == null) return this._arr[0];
    return this._arr.find(Queryable._toFn(predicate) as (x: T) => boolean);
  }

  FirstOrDefault(defaultValue: T | null = null, predicate?: (x: T) => boolean): T | null {
    const found = predicate
      ? this._arr.find(Queryable._toFn(predicate) as (x: T) => boolean)
      : this._arr[0];
    return found === undefined ? defaultValue : found;
  }

  Count(predicate?: (x: T) => boolean): number {
    if (!predicate) return this._arr.length;
    return this._arr.filter(Queryable._toFn(predicate) as (x: T) => boolean).length;
  }

  Sum(selector?: Selector<T, number | null | undefined>): number {
    const s = Queryable._toFn(selector ?? ((x) => (x as number) ?? 0));
    return this._arr.reduce((acc, x) => acc + (Number(s(x) ?? 0)), 0);
  }

  Average(selector?: Selector<T, number | null | undefined>): number {
    if (this._arr.length === 0) return 0;
    return this.Sum(selector) / this._arr.length;
  }

  Skip(n: number): Queryable<T> {
    return new Queryable(this._arr.slice(n));
  }

  SkipWhile(predicate: (x: T, index: number) => boolean): Queryable<T> {
    let i = 0;
    while (i < this._arr.length && predicate(this._arr[i], i)) i++;
    return new Queryable(this._arr.slice(i));
  }

  Take(n: number): Queryable<T> {
    return new Queryable(this._arr.slice(0, n));
  }

  TakeWhile(predicate: (x: T, index: number) => boolean): Queryable<T> {
    const out: T[] = [];
    for (let i = 0; i < this._arr.length; i++) {
      if (!predicate(this._arr[i], i)) break;
      out.push(this._arr[i]);
    }
    return new Queryable(out);
  }

  ToArray(): T[] {
    return [...this._arr];
  }

  ToList(): T[] {
    return this.ToArray();
  }

  Join<U, R>(
    inner: Iterable<U>,
    outerKey: Selector<T>,
    innerKey: Selector<U>,
    result?: (outer: T, inner: U) => R
  ): Queryable<R> {
    const oKey = Queryable._toFn(outerKey);
    const iKey = Queryable._toFn(innerKey);
    const res = result ?? ((o: T, i: U) => ({ ...(o as object), ...(i as object) } as R));

    const map = new Map<unknown, U[]>();
    for (const i of inner) {
      const k = iKey(i);
      const arr = map.get(k) ?? [];
      if (arr.length === 0) map.set(k, arr);
      arr.push(i);
    }

    const out: R[] = [];
    for (const o of this._arr) {
      const matches = map.get(oKey(o));
      if (matches) for (const i of matches) out.push(res(o, i));
    }
    return new Queryable(out);
  }

  LeftJoin<U, R>(
    inner: Iterable<U>,
    outerKey: Selector<T>,
    innerKey: Selector<U>,
    result?: (outer: T, inner: U | null) => R
  ): Queryable<R> {
    const oKey = Queryable._toFn(outerKey);
    const iKey = Queryable._toFn(innerKey);
    const res =
      result ?? ((o: T, i: U | null) => ({ ...(o as object), ...((i ?? {}) as object) } as R));

    const map = new Map<unknown, U[]>();
    for (const i of inner) {
      const k = iKey(i);
      const arr = map.get(k) ?? [];
      if (arr.length === 0) map.set(k, arr);
      arr.push(i);
    }

    const out: R[] = [];
    for (const o of this._arr) {
      const matches = map.get(oKey(o));
      if (!matches) out.push(res(o, null));
      else for (const i of matches) out.push(res(o, i));
    }
    return new Queryable(out);
  }

  Contains(value: T, comparer: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
    return this._arr.some((x) => comparer(x, value));
  }

  DefaultIfEmpty(defaultValue: T | null = null): Queryable<T | null> {
    return this._arr.length === 0 ? new Queryable([defaultValue]) : (this as Queryable<T | null>);
  }

  Append(item: T): Queryable<T> {
    return new Queryable([...this._arr, item]);
  }

  Prepend(item: T): Queryable<T> {
    return new Queryable([item, ...this._arr]);
  }

  Chunk(size: number): Queryable<T[]> {
    const out: T[][] = [];
    for (let i = 0; i < this._arr.length; i += size) {
      out.push(this._arr.slice(i, i + size));
    }
    return new Queryable(out);
  }

  Zip<U, R>(other: Iterable<U>, selector: (a: T, b: U) => R = (a, b) => [a, b] as unknown as R): Queryable<R> {
    const otherArr = Array.from(other);
    const len = Math.min(this._arr.length, otherArr.length);
    const out: R[] = [];
    for (let i = 0; i < len; i++) out.push(selector(this._arr[i], otherArr[i]));
    return new Queryable(out);
  }

  Except(other: Iterable<T>, keySelector: Selector<T> = (x) => x as unknown): Queryable<T> {
    const ks = Queryable._toFn(keySelector);
    const set = new Set(Array.from(other, (x) => ks(x)));
    return new Queryable(this._arr.filter((x) => !set.has(ks(x))));
  }

  Intersect(other: Iterable<T>, keySelector: Selector<T> = (x) => x as unknown): Queryable<T> {
    const ks = Queryable._toFn(keySelector);
    const set = new Set(Array.from(other, (x) => ks(x)));
    return new Queryable(this._arr.filter((x) => set.has(ks(x))));
  }

  // --- Additional LINQ-style methods ---

  Aggregate<R>(accumulator: (acc: R, x: T) => R, seed: R): R;
  Aggregate(accumulator: (acc: T, x: T) => T): T | undefined;
  Aggregate<R>(accumulator: (acc: R, x: T) => R, seed?: R): R | undefined {
    if (seed !== undefined) return this._arr.reduce(accumulator, seed);
    if (this._arr.length === 0) return undefined;
    return this._arr.slice(1).reduce(accumulator as unknown as (acc: T, x: T) => T, this._arr[0]) as unknown as R | undefined;
  }

  Concat(other: Iterable<T>): Queryable<T> {
    return new Queryable([...this._arr, ...Array.from(other)]);
  }

  ElementAt(index: number): T | undefined {
    return this._arr[index];
  }

  ElementAtOrDefault(index: number, defaultValue: T | null = null): T | null {
    const v = this._arr[index];
    return v === undefined ? defaultValue : v;
  }

  Last(predicate?: Predicate<T> | ((x: T) => boolean)): T | undefined {
    if (predicate == null) return this._arr[this._arr.length - 1];
    for (let i = this._arr.length - 1; i >= 0; i--) {
      if (Queryable._toFn(predicate)(this._arr[i])) return this._arr[i];
    }
    return undefined;
  }

  LastOrDefault(defaultValue: T | null = null, predicate?: (x: T) => boolean): T | null {
    const found = predicate
      ? this.Last(predicate)
      : this._arr[this._arr.length - 1];
    return found === undefined ? defaultValue : found;
  }

  Max(selector?: Selector<T, number | null | undefined>): number {
    if (this._arr.length === 0) return NaN;
    const s = Queryable._toFn(selector ?? ((x) => (x as number) ?? NaN));
    return Math.max(...this._arr.map((x) => Number(s(x) ?? NaN)));
  }

  Min(selector?: Selector<T, number | null | undefined>): number {
    if (this._arr.length === 0) return NaN;
    const s = Queryable._toFn(selector ?? ((x) => (x as number) ?? NaN));
    return Math.min(...this._arr.map((x) => Number(s(x) ?? NaN)));
  }

  MaxBy(keySelector: Selector<T>): T | undefined {
    if (this._arr.length === 0) return undefined;
    const ks = Queryable._toFn(keySelector);
    let maxItem = this._arr[0];
    let maxKey = ks(maxItem);
    for (let i = 1; i < this._arr.length; i++) {
      const key = ks(this._arr[i]);
      if (Queryable._compare(key, maxKey) > 0) {
        maxKey = key;
        maxItem = this._arr[i];
      }
    }
    return maxItem;
  }

  MinBy(keySelector: Selector<T>): T | undefined {
    if (this._arr.length === 0) return undefined;
    const ks = Queryable._toFn(keySelector);
    let minItem = this._arr[0];
    let minKey = ks(minItem);
    for (let i = 1; i < this._arr.length; i++) {
      const key = ks(this._arr[i]);
      if (Queryable._compare(key, minKey) < 0) {
        minKey = key;
        minItem = this._arr[i];
      }
    }
    return minItem;
  }

  Reverse(): Queryable<T> {
    return new Queryable([...this._arr].reverse());
  }

  SequenceEqual(other: Iterable<T>, comparer: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
    const otherArr = Array.from(other);
    if (this._arr.length !== otherArr.length) return false;
    return this._arr.every((x, i) => comparer(x, otherArr[i]));
  }

  Single(predicate?: (x: T) => boolean): T {
    const filtered = predicate ? this._arr.filter(Queryable._toFn(predicate) as (x: T) => boolean) : this._arr;
    if (filtered.length !== 1) throw new Error('Sequence contains more than one element or no element.');
    return filtered[0];
  }

  SingleOrDefault(defaultValue: T | null = null, predicate?: (x: T) => boolean): T | null {
    const filtered = predicate ? this._arr.filter(Queryable._toFn(predicate) as (x: T) => boolean) : this._arr;
    if (filtered.length === 0) return defaultValue;
    if (filtered.length > 1) throw new Error('Sequence contains more than one element.');
    return filtered[0];
  }

  Union(other: Iterable<T>, keySelector: Selector<T> = (x) => x as unknown): Queryable<T> {
    const ks = Queryable._toFn(keySelector);
    const seen = new Set<unknown>();
    const out: T[] = [];
    for (const x of this._arr) {
      const k = ks(x);
      if (!seen.has(k)) { seen.add(k); out.push(x); }
    }
    for (const x of other) {
      const k = ks(x);
      if (!seen.has(k)) { seen.add(k); out.push(x); }
    }
    return new Queryable(out);
  }

  SkipLast(n: number): Queryable<T> {
    if (n <= 0) return this;
    return new Queryable(this._arr.slice(0, -n));
  }

  TakeLast(n: number): Queryable<T> {
    if (n <= 0) return new Queryable([]);
    return new Queryable(this._arr.slice(-n));
  }

  OfType<R extends T>(typeGuard: (x: T) => x is R): Queryable<R> {
    return new Queryable(this._arr.filter(typeGuard) as R[]);
  }

  Cast<R>(): Queryable<R> {
    return new Queryable(this._arr as unknown as R[]);
  }

  ToDictionary<K, V = T>(keySelector: Selector<T, K>, valueSelector?: Selector<T, V>): Map<K, V> {
    const kFn = Queryable._toFn(keySelector);
    const vFn = valueSelector ? Queryable._toFn(valueSelector) : (x: T) => x as unknown as V;
    const map = new Map<K, V>();
    for (const item of this._arr) map.set(kFn(item), vFn(item));
    return map;
  }

  ToHashSet<K = unknown>(keySelector: Selector<T, K> = (x) => x as unknown as K): Set<K> {
    const ks = Queryable._toFn(keySelector);
    return new Set(this._arr.map(ks));
  }

  FindIndex(predicate: (x: T, index: number) => boolean): number {
    return this._arr.findIndex(predicate);
  }

  FindLastIndex(predicate: (x: T, index: number) => boolean): number {
    for (let i = this._arr.length - 1; i >= 0; i--) {
      if (predicate(this._arr[i], i)) return i;
    }
    return -1;
  }

  IndexOf(value: T, comparer: (a: T, b: T) => boolean = (a, b) => a === b): number {
    const i = this._arr.findIndex((x) => comparer(x, value));
    return i;
  }

  LastIndexOf(value: T, comparer: (a: T, b: T) => boolean = (a, b) => a === b): number {
    for (let i = this._arr.length - 1; i >= 0; i--) {
      if (comparer(this._arr[i], value)) return i;
    }
    return -1;
  }

  WhereNotNull(): Queryable<NonNullable<T>> {
    return new Queryable(this._arr.filter((x): x is NonNullable<T> => x != null));
  }

  Flatten<R>(this: Queryable<Iterable<R>>): Queryable<R> {
    return new Queryable((this._arr as Iterable<R>[]).flatMap((x) => Array.from(x)));
  }

  Scan<R>(seed: R, accumulator: (acc: R, x: T) => R): Queryable<R> {
    const out: R[] = [];
    let acc = seed;
    for (const x of this._arr) {
      acc = accumulator(acc, x);
      out.push(acc);
    }
    return new Queryable(out);
  }

  Pairwise<R>(selector: (prev: T, curr: T) => R = (prev, curr) => [prev, curr] as unknown as R): Queryable<R> {
    const out: R[] = [];
    for (let i = 1; i < this._arr.length; i++) {
      out.push(selector(this._arr[i - 1], this._arr[i]));
    }
    return new Queryable(out);
  }

  Window(size: number): Queryable<T[]> {
    if (size <= 0) return new Queryable([]);
    const out: T[][] = [];
    for (let i = 0; i <= this._arr.length - size; i++) {
      out.push(this._arr.slice(i, i + size));
    }
    return new Queryable(out);
  }

  Partition(predicate: (x: T) => boolean): [Queryable<T>, Queryable<T>] {
    const pass: T[] = [];
    const fail: T[] = [];
    const p = Queryable._toFn(predicate) as (x: T) => boolean;
    for (const x of this._arr) (p(x) ? pass : fail).push(x);
    return [new Queryable(pass), new Queryable(fail)];
  }

  ForEach(action: (x: T, index: number) => void): void {
    this._arr.forEach(action);
  }

  ToRecord<K extends string | number | symbol, V = T>(
    keySelector: Selector<T, K>,
    valueSelector?: Selector<T, V>
  ): Record<K, V> {
    const kFn = Queryable._toFn(keySelector);
    const vFn = valueSelector ? Queryable._toFn(valueSelector) : (x: T) => x as unknown as V;
    const record = {} as Record<K, V>;
    for (const item of this._arr) record[kFn(item) as K] = vFn(item);
    return record;
  }

  Shuffle(): Queryable<T> {
    const copy = [...this._arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return new Queryable(copy);
  }

  Sort(comparer?: (a: T, b: T) => number): Queryable<T> {
    const copy = [...this._arr];
    copy.sort(comparer ?? ((a, b) => Queryable._compare(a as unknown, b as unknown)));
    return new Queryable(copy);
  }

  Slice(start: number, end?: number): Queryable<T> {
    return new Queryable(this._arr.slice(start, end));
  }

  PadEnd(length: number, padding: T): Queryable<T> {
    if (this._arr.length >= length) return this;
    return new Queryable([...this._arr, ...Array(length - this._arr.length).fill(padding)]);
  }

  PadStart(length: number, padding: T): Queryable<T> {
    if (this._arr.length >= length) return this;
    return new Queryable([...Array(length - this._arr.length).fill(padding), ...this._arr]);
  }

  IntersectBy(other: Iterable<T>, keySelector: Selector<T>): Queryable<T> {
    return this.Intersect(other, keySelector);
  }

  ExceptBy(other: Iterable<T>, keySelector: Selector<T>): Queryable<T> {
    return this.Except(other, keySelector);
  }

  UnionBy(other: Iterable<T>, keySelector: Selector<T>): Queryable<T> {
    return this.Union(other, keySelector);
  }

  DistinctBy(keySelector: Selector<T>): Queryable<T> {
    return this.Distinct(keySelector);
  }

  Lead(n: number, defaultValue: T | null = null): Queryable<T | null> {
    if (n <= 0) return this as Queryable<T | null>;
    const out: (T | null)[] = [...this._arr.slice(n), ...Array(n).fill(defaultValue)].slice(0, this._arr.length);
    return new Queryable(out);
  }

  Lag(n: number, defaultValue: T | null = null): Queryable<T | null> {
    if (n <= 0) return this as Queryable<T | null>;
    const out: (T | null)[] = [...Array(n).fill(defaultValue), ...this._arr.slice(0, Math.max(0, this._arr.length - n))].slice(0, this._arr.length);
    return new Queryable(this._arr.length ? out : []);
  }

  Replace(oldValue: T, newValue: T, comparer: (a: T, b: T) => boolean = (a, b) => a === b): Queryable<T> {
    const out = [...this._arr];
    const i = out.findIndex((x) => comparer(x, oldValue));
    if (i !== -1) out[i] = newValue;
    return new Queryable(out);
  }

  ReplaceAll(oldValue: T, newValue: T, comparer: (a: T, b: T) => boolean = (a, b) => a === b): Queryable<T> {
    return new Queryable(this._arr.map((x) => (comparer(x, oldValue) ? newValue : x)));
  }

  RemoveAll(predicate: (x: T) => boolean): Queryable<T> {
    return new Queryable(this._arr.filter((x) => !predicate(x)));
  }

  Insert(index: number, item: T): Queryable<T> {
    const out = [...this._arr];
    out.splice(Math.max(0, index), 0, item);
    return new Queryable(out);
  }

  RemoveAt(index: number): Queryable<T> {
    const out = [...this._arr];
    if (index >= 0 && index < out.length) out.splice(index, 1);
    return new Queryable(out);
  }

  LongCount(predicate?: (x: T) => boolean): number {
    return this.Count(predicate);
  }

  CrossJoin<U, R>(other: Iterable<U>, resultSelector: (a: T, b: U) => R = (a, b) => [a, b] as unknown as R): Queryable<R> {
    const otherArr = Array.from(other);
    const out: R[] = [];
    for (const a of this._arr) for (const b of otherArr) out.push(resultSelector(a, b));
    return new Queryable(out);
  }

  GroupJoin<U, K, R>(
    inner: Iterable<U>,
    outerKey: Selector<T, K>,
    innerKey: Selector<U, K>,
    resultSelector: (outer: T, innerGroup: U[]) => R
  ): Queryable<R> {
    const oKey = Queryable._toFn(outerKey);
    const iKey = Queryable._toFn(innerKey);
    const map = new Map<K, U[]>();
    for (const i of inner) {
      const k = iKey(i);
      const arr = map.get(k) ?? [];
      if (arr.length === 0) map.set(k, arr);
      arr.push(i);
    }
    const out: R[] = [];
    for (const o of this._arr) {
      const group = map.get(oKey(o)) ?? [];
      out.push(resultSelector(o, group));
    }
    return new Queryable(out);
  }

  ZipLongest<U, R>(
    other: Iterable<U>,
    defaultThis: T,
    defaultOther: U,
    selector: (a: T, b: U) => R = (a, b) => [a, b] as unknown as R
  ): Queryable<R> {
    const otherArr = Array.from(other);
    const len = Math.max(this._arr.length, otherArr.length);
    const out: R[] = [];
    for (let i = 0; i < len; i++) {
      out.push(selector(this._arr[i] ?? defaultThis, otherArr[i] ?? defaultOther));
    }
    return new Queryable(out);
  }

  JoinToString(separator: string, selector: Selector<T, string> = (x) => String(x)): string {
    const s = Queryable._toFn(selector);
    return this._arr.map(s).join(separator);
  }

  TakeEvery(step: number, startIndex: number = 0): Queryable<T> {
    if (step <= 0) return new Queryable([]);
    const out: T[] = [];
    for (let i = startIndex; i < this._arr.length; i += step) out.push(this._arr[i]);
    return new Queryable(out);
  }

  Batch(size: number): Queryable<T[]> {
    return this.Chunk(size);
  }

  Fill(value: T, start: number = 0, end?: number): Queryable<T> {
    const out = [...this._arr];
    const endIndex = end ?? this._arr.length;
    for (let i = start; i < endIndex && i < out.length; i++) out[i] = value;
    return new Queryable(out);
  }

  CopyTo(array: T[], startIndex: number = 0): void {
    for (let i = 0; i < this._arr.length; i++) array[startIndex + i] = this._arr[i];
  }
}
