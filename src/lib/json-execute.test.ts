import { describe, it, expect } from 'vitest';
import { runJsonScript } from './json-execute';

const VALID_JSON = '{"user":{"name":"John"},"posts":[{"id":1}]}';

describe('runJsonScript', () => {
  it('runs script with comment-only lines between statements', () => {
    const code = `const x = data.user.name;
// comment line
Dump(x);`;
    const { output, meta } = runJsonScript(VALID_JSON, code);
    expect(meta.jsonValid).toBe(true);
    const results = output.filter((e) => e.type === 'result');
    expect(results.some((e) => e.content === 'John')).toBe(true);
  });

  it('Dump path returns dumped values', () => {
    const code = 'Dump(data.posts.map(p => p.id));';
    const { output } = runJsonScript(VALID_JSON, code);
    const results = output.filter((e) => e.type === 'result');
    expect(results.some((e) => e.content.includes('1'))).toBe(true);
  });

  it('returns JSON parse error for invalid JSON', () => {
    const { output, meta } = runJsonScript('{invalid', 'Dump(data);');
    expect(meta.jsonValid).toBe(false);
    expect(output[0].type).toBe('error');
    expect(output[0].content).toContain('JSON Parse Error');
  });
});
