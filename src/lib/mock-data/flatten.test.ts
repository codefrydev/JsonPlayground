import { describe, it, expect } from 'vitest';
import { flattenRecord } from './flatten';

describe('flattenRecord', () => {
  it('flattens nested objects with dot notation', () => {
    const flat = flattenRecord({
      id: 1,
      address: { city: 'NYC', country: 'USA' },
    });
    expect(flat).toEqual({
      id: '1',
      'address.city': 'NYC',
      'address.country': 'USA',
    });
  });

  it('stringifies arrays', () => {
    const flat = flattenRecord({ tags: ['a', 'b'] });
    expect(flat.tags).toBe('["a","b"]');
  });
});
