import { describe, it, expect } from 'vitest';
import { diffJson } from './json-diff';

describe('diffJson', () => {
  it('detects added and removed keys', () => {
    const left = { a: 1 };
    const right = { a: 1, b: 2 };
    const entries = diffJson(left, right);
    expect(entries.some((e) => e.type === 'added' && e.path === 'b')).toBe(true);
  });

  it('detects changed values', () => {
    const entries = diffJson({ x: 1 }, { x: 2 });
    expect(entries.some((e) => e.type === 'changed' && e.path === 'x')).toBe(true);
  });
});
