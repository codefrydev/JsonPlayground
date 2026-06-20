import { createSchemaField } from './field-catalog';
import type { FieldType, SchemaField } from './types';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function inferScalarType(value: unknown): FieldType {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'float';
  }
  if (typeof value === 'string' && ISO_DATE_RE.test(value)) return 'date';
  return 'lorem';
}

function inferField(name: string, value: unknown): SchemaField {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return createSchemaField({
        name,
        type: 'array',
        options: { minItems: 0, maxItems: 0 },
        item: createSchemaField({ name: '', type: 'lorem' }),
      });
    }
    const first = value[0];
    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      const children = inferFromObject(first as Record<string, unknown>);
      return createSchemaField({
        name,
        type: 'array',
        options: { minItems: value.length, maxItems: value.length },
        item: createSchemaField({ name: '', type: 'object', children }),
      });
    }
    return createSchemaField({
      name,
      type: 'array',
      options: { minItems: value.length, maxItems: value.length },
      item: createSchemaField({ name: '', type: inferScalarType(first) }),
    });
  }

  if (typeof value === 'object' && value !== null) {
    return createSchemaField({
      name,
      type: 'object',
      children: inferFromObject(value as Record<string, unknown>),
    });
  }

  return createSchemaField({
    name,
    type: inferScalarType(value),
    blankPercent: 0,
  });
}

function inferFromObject(obj: Record<string, unknown>): SchemaField[] {
  return Object.entries(obj).map(([name, value]) => inferField(name, value));
}

export type InferSchemaResult =
  | { ok: true; fields: SchemaField[] }
  | { ok: false; error: string };

export function inferSchemaFromJson(input: unknown): InferSchemaResult {
  if (input === null || input === undefined) {
    return { ok: false, error: 'Input must be a JSON object or array of objects.' };
  }

  if (Array.isArray(input)) {
    if (input.length === 0) {
      return { ok: false, error: 'JSON array must contain at least one object.' };
    }
    const first = input[0];
    if (typeof first !== 'object' || first === null || Array.isArray(first)) {
      return { ok: false, error: 'Each array item must be an object.' };
    }
    return { ok: true, fields: inferFromObject(first as Record<string, unknown>) };
  }

  if (typeof input === 'object' && !Array.isArray(input)) {
    return { ok: true, fields: inferFromObject(input as Record<string, unknown>) };
  }

  return { ok: false, error: 'Input must be a JSON object or array of objects.' };
}
