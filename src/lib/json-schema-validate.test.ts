import { describe, it, expect } from 'vitest';
import { validateAgainstSchema } from './json-schema-validate';

describe('validateAgainstSchema', () => {
  it('validates data against schema', () => {
    const schema = JSON.stringify({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    });
    const ok = validateAgainstSchema({ name: 'test' }, schema);
    expect(ok.valid).toBe(true);

    const bad = validateAgainstSchema({ name: 1 }, schema);
    expect(bad.valid).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);
  });
});
