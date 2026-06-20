import { describe, it, expect } from 'vitest';
import { generateRecords, validateSchema, clampRowCount } from './generate';
import { createSchemaField } from './field-catalog';

describe('generateRecords', () => {
  const fields = [
    createSchemaField({ name: 'id', type: 'row_number' }),
    createSchemaField({ name: 'email', type: 'email' }),
  ];

  it('produces deterministic output with fixed seed', () => {
    const a = generateRecords(fields, 3, 42);
    const b = generateRecords(fields, 3, 42);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.records).toEqual(b.records);
    }
  });

  it('generates sequential row_number values', () => {
    const result = generateRecords(
      [createSchemaField({ name: 'id', type: 'row_number' })],
      5,
      1
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.records.map((r) => r.id)).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it('produces nulls when blankPercent is 100', () => {
    const result = generateRecords(
      [createSchemaField({ name: 'email', type: 'email', blankPercent: 100 })],
      5,
      1,
      () => 0
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.records.every((r) => r.email === null)).toBe(true);
    }
  });

  it('caps row count at 1000', () => {
    expect(clampRowCount(5000)).toBe(1000);
    const result = generateRecords(fields, 5000, 1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.records).toHaveLength(1000);
    }
  });

  it('returns error for duplicate field names', () => {
    const dupFields = [
      createSchemaField({ name: 'id', type: 'row_number' }),
      createSchemaField({ name: 'id', type: 'uuid' }),
    ];
    expect(validateSchema(dupFields)).toMatch(/Duplicate/);
    const result = generateRecords(dupFields, 1);
    expect(result.ok).toBe(false);
  });

  it('returns error when no named fields', () => {
    const result = generateRecords(
      [createSchemaField({ name: '  ', type: 'lorem' })],
      1
    );
    expect(result.ok).toBe(false);
  });

  it('generates nested objects', () => {
    const nested = [
      createSchemaField({
        name: 'address',
        type: 'object',
        children: [
          createSchemaField({ name: 'city', type: 'city' }),
          createSchemaField({ name: 'zip', type: 'integer', options: { min: 10000, max: 99999 } }),
        ],
      }),
    ];
    const result = generateRecords(nested, 2, 99);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.records[0].address).toMatchObject({
        city: expect.any(String),
        zip: expect.any(Number),
      });
    }
  });

  it('generates arrays of scalars', () => {
    const arr = [
      createSchemaField({
        name: 'tags',
        type: 'array',
        options: { minItems: 2, maxItems: 2 },
        item: createSchemaField({ name: '', type: 'lorem' }),
      }),
    ];
    const result = generateRecords(arr, 1, 7);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.isArray(result.records[0].tags)).toBe(true);
      expect((result.records[0].tags as unknown[]).length).toBe(2);
    }
  });

  it('generates arrays of objects', () => {
    const arr = [
      createSchemaField({
        name: 'items',
        type: 'array',
        options: { minItems: 1, maxItems: 1 },
        item: createSchemaField({
          name: '',
          type: 'object',
          children: [
            createSchemaField({ name: 'sku', type: 'uuid' }),
            createSchemaField({ name: 'qty', type: 'integer' }),
          ],
        }),
      }),
    ];
    const result = generateRecords(arr, 1, 11);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const items = result.records[0].items as Record<string, unknown>[];
      expect(items[0]).toMatchObject({
        sku: expect.any(String),
        qty: expect.any(Number),
      });
    }
  });
});
