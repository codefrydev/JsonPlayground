import { describe, it, expect } from 'vitest';
import { parseJson, sortJsonKeys, offsetToLineCol } from './json-parse';

describe('parseJson', () => {
  it('parses valid JSON', () => {
    const result = parseJson('{"a":1}');
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.data).toEqual({ a: 1 });
  });

  it('returns line and column for position errors', () => {
    const text = '{"a":]';
    const result = parseJson(text);
    expect(result.valid).toBe(false);
    if (!result.valid && result.position !== undefined) {
      const { line, column } = offsetToLineCol(text, result.position);
      expect(result.line).toBe(line);
      expect(result.column).toBe(column);
    }
  });
});

describe('sortJsonKeys', () => {
  it('sorts object keys recursively', () => {
    const sorted = sortJsonKeys({ z: 1, a: { y: 2, b: 3 }, items: [1, 2] });
    expect(Object.keys(sorted as object)).toEqual(['a', 'items', 'z']);
    expect(Object.keys((sorted as { a: object }).a)).toEqual(['b', 'y']);
    expect((sorted as { items: number[] }).items).toEqual([1, 2]);
  });
});
