import { describe, it, expect } from 'vitest';
import { inferSchemaFromJson } from './infer-schema';

describe('inferSchemaFromJson', () => {
  it('infers fields from array of objects', () => {
    const result = inferSchemaFromJson([
      { id: 1, active: true, created: '2024-01-15', note: 'hello' },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const types = Object.fromEntries(result.fields.map((f) => [f.name, f.type]));
      expect(types).toEqual({
        id: 'integer',
        active: 'boolean',
        created: 'date',
        note: 'lorem',
      });
    }
  });

  it('infers nested object fields', () => {
    const result = inferSchemaFromJson({
      name: 'Alice',
      address: { city: 'NYC', zip: 10001 },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const address = result.fields.find((f) => f.name === 'address');
      expect(address?.type).toBe('object');
      expect(address?.children?.map((c) => c.name)).toEqual(['city', 'zip']);
    }
  });

  it('infers array of scalars and array of objects', () => {
    const result = inferSchemaFromJson({
      tags: ['a', 'b'],
      orders: [{ id: 1, total: 9.99 }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const tags = result.fields.find((f) => f.name === 'tags');
      expect(tags?.type).toBe('array');
      expect(tags?.item?.type).toBe('lorem');

      const orders = result.fields.find((f) => f.name === 'orders');
      expect(orders?.type).toBe('array');
      expect(orders?.item?.type).toBe('object');
      expect(orders?.item?.children?.map((c) => c.name)).toEqual(['id', 'total']);
    }
  });

  it('infers fields from single object', () => {
    const result = inferSchemaFromJson({ name: 'Alice', score: 3.14 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fields).toHaveLength(2);
      expect(result.fields.find((f) => f.name === 'name')?.type).toBe('lorem');
      expect(result.fields.find((f) => f.name === 'score')?.type).toBe('float');
    }
  });

  it('returns error for empty array', () => {
    const result = inferSchemaFromJson([]);
    expect(result.ok).toBe(false);
  });

  it('returns error for non-object input', () => {
    expect(inferSchemaFromJson('text').ok).toBe(false);
    expect(inferSchemaFromJson(42).ok).toBe(false);
    expect(inferSchemaFromJson(null).ok).toBe(false);
  });
});
