export type JsonDiffType = 'added' | 'removed' | 'changed';

export interface JsonDiffEntry {
  path: string;
  type: JsonDiffType;
  left?: unknown;
  right?: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function diffJson(left: unknown, right: unknown, path = ''): JsonDiffEntry[] {
  const entries: JsonDiffEntry[] = [];

  if (left === undefined && right !== undefined) {
    entries.push({ path: path || '/', type: 'added', right });
    return entries;
  }
  if (right === undefined && left !== undefined) {
    entries.push({ path: path || '/', type: 'removed', left });
    return entries;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    const maxLen = Math.max(left.length, right.length);
    for (let i = 0; i < maxLen; i++) {
      const childPath = `${path}[${i}]`;
      if (i >= left.length) {
        entries.push({ path: childPath, type: 'added', right: right[i] });
      } else if (i >= right.length) {
        entries.push({ path: childPath, type: 'removed', left: left[i] });
      } else {
        entries.push(...diffJson(left[i], right[i], childPath));
      }
    }
    return entries;
  }

  if (isObject(left) && isObject(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) {
      const childPath = path ? `${path}.${key}` : key;
      if (!(key in left)) {
        entries.push({ path: childPath, type: 'added', right: right[key] });
      } else if (!(key in right)) {
        entries.push({ path: childPath, type: 'removed', left: left[key] });
      } else {
        entries.push(...diffJson(left[key], right[key], childPath));
      }
    }
    return entries;
  }

  if (JSON.stringify(left) !== JSON.stringify(right)) {
    entries.push({ path: path || '/', type: 'changed', left, right });
  }

  return entries;
}
