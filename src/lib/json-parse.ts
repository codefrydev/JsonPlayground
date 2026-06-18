export type JsonParseResult =
  | { valid: true; data: unknown }
  | { valid: false; error: string; line?: number; column?: number; position?: number };

export function offsetToLineCol(text: string, offset: number): { line: number; column: number } {
  const clamped = Math.max(0, Math.min(offset, text.length));
  let line = 1;
  let lastLineStart = 0;
  for (let i = 0; i < clamped; i++) {
    if (text[i] === '\n') {
      line++;
      lastLineStart = i + 1;
    }
  }
  return { line, column: clamped - lastLineStart + 1 };
}

function extractPosition(message: string): number | undefined {
  const match = message.match(/position\s+(\d+)/i);
  if (match) return Number(match[1]);
  const atMatch = message.match(/at line (\d+) column (\d+)/i);
  if (atMatch) return undefined;
  return undefined;
}

export function parseJson(text: string): JsonParseResult {
  try {
    const data = JSON.parse(text);
    return { valid: true, data };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Invalid JSON';
    const position = extractPosition(error);
    if (position !== undefined) {
      const { line, column } = offsetToLineCol(text, position);
      return { valid: false, error, line, column, position };
    }
    const lineColMatch = error.match(/at line (\d+) column (\d+)/i);
    if (lineColMatch) {
      return {
        valid: false,
        error,
        line: Number(lineColMatch[1]),
        column: Number(lineColMatch[2]),
      };
    }
    return { valid: false, error };
  }
}

export function jsonStatusFromParse(result: JsonParseResult): {
  valid: boolean;
  error?: string;
  line?: number;
  column?: number;
  position?: number;
} {
  if (result.valid === false) {
    return {
      valid: false,
      error: result.error,
      line: result.line,
      column: result.column,
      position: result.position,
    };
  }
  return { valid: true };
}

export function sortJsonKeys(data: unknown): unknown {
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sortJsonKeys);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(data as object).sort()) {
    sorted[key] = sortJsonKeys((data as Record<string, unknown>)[key]);
  }
  return sorted;
}
