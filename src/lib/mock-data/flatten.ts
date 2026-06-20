/**
 * Flatten nested records to dot-notation keys for table/CSV preview.
 */
export function flattenRecord(
  record: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const flat: Record<string, string> = {};

  for (const [key, value] of Object.entries(record)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      flat[path] = '';
    } else if (Array.isArray(value)) {
      flat[path] = JSON.stringify(value);
    } else if (typeof value === 'object') {
      Object.assign(flat, flattenRecord(value as Record<string, unknown>, path));
    } else {
      flat[path] = String(value);
    }
  }

  return flat;
}

export function flattenRecords(records: Record<string, unknown>[]): Record<string, string>[] {
  return records.map((r) => flattenRecord(r));
}
