/**
 * CSV ↔ JSON (array of objects) conversion.
 * First row is treated as headers. Handles quoted fields and commas inside quotes.
 */

/** Parsed CSV as array of objects (first row = keys). For table preview. */
export function csvToData(csv: string): { ok: true; data: Record<string, string>[] } | { ok: false; error: string } {
  try {
    const rows = parseCsvLines(csv);
    if (rows.length === 0) {
      return { ok: true, data: [] };
    }
    const headers = rows[0];
    const data = rows.slice(1).map((cells) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = cells[i] ?? '';
      });
      return obj;
    });
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'CSV parse failed',
    };
  }
}

export function csvToJson(csv: string): { ok: true; json: string } | { ok: false; error: string } {
  const result = csvToData(csv);
  if (!result.ok) return result;
  return { ok: true, json: JSON.stringify(result.data, null, 2) };
}

/** Parse CSV string into rows of cell strings. Handles "quoted" fields and newlines inside quotes. */
function parseCsvLines(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let i = 0;
  let inQuotes = false;
  while (i < csv.length) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      i++;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && csv[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  row.push(cell);
  if (row.some((c) => c.length > 0)) rows.push(row);
  return rows;
}

/** Escape a cell for CSV: quote if contains comma, newline, or double quote. */
function escapeCsvCell(value: string): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function jsonToCsv(jsonStr: string): { ok: true; csv: string } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(jsonStr) as unknown;
    if (!Array.isArray(parsed)) {
      return { ok: false, error: 'JSON must be an array of objects' };
    }
    if (parsed.length === 0) {
      return { ok: true, csv: '' };
    }
    const first = parsed[0];
    if (typeof first !== 'object' || first === null) {
      return { ok: false, error: 'Each item must be an object' };
    }
    const headers = Array.from(
      new Set(parsed.flatMap((row) => (typeof row === 'object' && row !== null ? Object.keys(row as Record<string, unknown>) : [])))
    );
    const headerLine = headers.map(escapeCsvCell).join(',');
    const dataLines = parsed.map((row) => {
      const o = row as Record<string, unknown>;
      return headers.map((h) => escapeCsvCell(String(o[h] ?? ''))).join(',');
    });
    return { ok: true, csv: [headerLine, ...dataLines].join('\n') };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Invalid JSON',
    };
  }
}
