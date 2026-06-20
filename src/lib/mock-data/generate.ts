import { faker } from '@faker-js/faker';
import { generateValue } from './generators';
import { MAX_ROW_COUNT, isScalarType, type SchemaField } from './types';

function activeNamedFields(fields: SchemaField[]): SchemaField[] {
  return fields.filter((f) => f.name.trim().length > 0);
}

function validateSiblingNames(fields: SchemaField[], context: string): string | null {
  const active = activeNamedFields(fields);
  const names = active.map((f) => f.name.trim());
  const dup = names.find((name, i) => names.indexOf(name) !== i);
  if (dup) {
    return context
      ? `Duplicate field name "${dup}" in ${context}`
      : `Duplicate field name: "${dup}"`;
  }
  return null;
}

function validateFieldList(fields: SchemaField[], context = ''): string | null {
  const nameError = validateSiblingNames(fields, context);
  if (nameError) return nameError;

  for (const field of activeNamedFields(fields)) {
    const ctx = context ? `${context}.${field.name.trim()}` : field.name.trim();

    if (field.type === 'object') {
      const children = field.children ?? [];
      if (children.length === 0) {
        return `Object "${ctx}" must have at least one nested field.`;
      }
      const childError = validateFieldList(children, ctx);
      if (childError) return childError;
    }

    if (field.type === 'array') {
      if (!field.item) {
        return `Array "${ctx}" must define an item type.`;
      }
      const min = field.options?.minItems ?? 1;
      const max = field.options?.maxItems ?? 3;
      if (min > max) {
        return `Array "${ctx}": min items cannot exceed max items.`;
      }
      if (field.item.type === 'object') {
        const children = field.item.children ?? [];
        if (children.length === 0) {
          return `Array "${ctx}" object items must have at least one nested field.`;
        }
        const childError = validateFieldList(children, `${ctx}[]`);
        if (childError) return childError;
      }
    }
  }

  return null;
}

export function validateSchema(fields: SchemaField[]): string | null {
  if (activeNamedFields(fields).length === 0) {
    return 'Add at least one field with a name.';
  }
  return validateFieldList(fields);
}

export function clampRowCount(rowCount: number): number {
  const n = Math.floor(rowCount);
  if (Number.isNaN(n) || n < 1) return 1;
  return Math.min(n, MAX_ROW_COUNT);
}

function generateScalar(
  field: SchemaField,
  rowIndex: number,
  random: () => number
): unknown {
  if (random() * 100 < field.blankPercent) {
    return null;
  }
  return generateValue(field.type, rowIndex, field.options, faker);
}

function generateObjectChildren(
  children: SchemaField[],
  rowIndex: number,
  random: () => number
): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const child of activeNamedFields(children)) {
    record[child.name.trim()] = generateFieldValue(child, rowIndex, random);
  }
  return record;
}

function generateFieldValue(
  field: SchemaField,
  rowIndex: number,
  random: () => number
): unknown {
  if (field.type === 'object') {
    if (random() * 100 < field.blankPercent) return null;
    return generateObjectChildren(field.children ?? [], rowIndex, random);
  }

  if (field.type === 'array') {
    if (random() * 100 < field.blankPercent) return null;
    const min = field.options?.minItems ?? 1;
    const max = field.options?.maxItems ?? 3;
    const length = faker.number.int({ min, max });
    const item = field.item;
    if (!item) return [];

    return Array.from({ length }, () => generateArrayItem(item, rowIndex, random));
  }

  if (isScalarType(field.type)) {
    return generateScalar(field, rowIndex, random);
  }

  return null;
}

function generateArrayItem(
  item: SchemaField,
  rowIndex: number,
  random: () => number
): unknown {
  if (item.type === 'object') {
    return generateObjectChildren(item.children ?? [], rowIndex, random);
  }
  if (item.type === 'array') {
    return generateFieldValue(item, rowIndex, random);
  }
  if (isScalarType(item.type)) {
    return generateValue(item.type, rowIndex, item.options, faker);
  }
  return null;
}

export type GenerateResult =
  | { ok: true; records: Record<string, unknown>[] }
  | { ok: false; error: string };

export function generateRecords(
  fields: SchemaField[],
  rowCount: number,
  seed?: number,
  random: () => number = Math.random
): GenerateResult {
  const validationError = validateSchema(fields);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  if (seed !== undefined) {
    faker.seed(seed);
  }

  const count = clampRowCount(rowCount);
  const records: Record<string, unknown>[] = [];

  for (let rowIndex = 0; rowIndex < count; rowIndex++) {
    records.push(generateObjectChildren(fields, rowIndex, random));
  }

  return { ok: true, records };
}
