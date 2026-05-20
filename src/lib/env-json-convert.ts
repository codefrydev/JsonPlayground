/**
 * .env (KEY=value) ↔ JSON object conversion.
 * Strips comments and empty lines. Handles KEY="value" and KEY=value.
 */

export function envToJson(envStr: string): { ok: true; json: string } | { ok: false; error: string } {
  try {
    const obj: Record<string, string> = {};
    const lines = envStr.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1).replace(/\\'/g, "'");
      }
      if (key) obj[key] = value;
    }
    return { ok: true, json: JSON.stringify(obj, null, 2) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Parse failed',
    };
  }
}

function escapeEnvValue(value: string): string {
  if (/[\s#"']/.test(value) || value === '') {
    return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
  }
  return value;
}

export function jsonToEnv(jsonStr: string): { ok: true; env: string } | { ok: false; error: string } {
  try {
    const obj = JSON.parse(jsonStr) as unknown;
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return { ok: false, error: 'JSON must be a flat object' };
    }
    const lines = Object.entries(obj as Record<string, unknown>).map(([k, v]) => {
      const key = String(k).replace(/[#\s=]/g, '_');
      const value = v === null || v === undefined ? '' : String(v);
      return `${key}=${escapeEnvValue(value)}`;
    });
    return { ok: true, env: lines.join('\n') };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Invalid JSON',
    };
  }
}
