import Ajv, { type ErrorObject } from 'ajv';
import { parseJson } from '@/lib/json-parse';

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

let ajvInstance: Ajv | null = null;

function getAjv(): Ajv {
  if (!ajvInstance) {
    ajvInstance = new Ajv({ allErrors: true, strict: false });
  }
  return ajvInstance;
}

function formatError(err: ErrorObject): string {
  const path = err.instancePath || '/';
  return `${path}: ${err.message ?? 'validation error'}`;
}

export function validateAgainstSchema(
  data: unknown,
  schemaText: string
): SchemaValidationResult {
  const schemaParse = parseJson(schemaText);
  if (!schemaParse.valid) {
    return { valid: false, errors: [`Invalid schema JSON: ${schemaParse.error}`] };
  }

  try {
    const ajv = getAjv();
    const validate = ajv.compile(schemaParse.data as object);
    const valid = validate(data);
    if (valid) return { valid: true, errors: [] };
    return {
      valid: false,
      errors: (validate.errors ?? []).map(formatError),
    };
  } catch (e) {
    return {
      valid: false,
      errors: [e instanceof Error ? e.message : 'Schema compilation failed'],
    };
  }
}

export function schemaToDiagnostics(
  schemaText: string,
  dataText: string
): { from: number; to: number; message: string; severity: 'error' }[] {
  const dataResult = parseJson(dataText);
  if (!dataResult.valid || !schemaText.trim()) return [];

  const result = validateAgainstSchema(dataResult.data, schemaText);
  if (result.valid) return [];

  return [
    {
      from: 0,
      to: Math.min(1, dataText.length),
      message: result.errors.join('; '),
      severity: 'error' as const,
    },
  ];
}
