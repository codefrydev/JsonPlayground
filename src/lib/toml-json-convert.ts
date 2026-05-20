/**
 * TOML ↔ JSON conversion.
 * Uses @iarna/toml for parse and stringify.
 */

import * as toml from '@iarna/toml';

export function tomlToJson(tomlStr: string): { ok: true; json: string } | { ok: false; error: string } {
  try {
    const obj = toml.parse(tomlStr);
    return { ok: true, json: JSON.stringify(obj, null, 2) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'TOML parse failed',
    };
  }
}

export function jsonToToml(jsonStr: string): { ok: true; toml: string } | { ok: false; error: string } {
  try {
    const obj = JSON.parse(jsonStr) as Record<string, unknown>;
    if (typeof obj !== 'object' || obj === null) {
      return { ok: false, error: 'JSON must be an object' };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = toml.stringify(obj as any);
    return { ok: true, toml: out };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Invalid JSON or TOML stringify failed',
    };
  }
}
