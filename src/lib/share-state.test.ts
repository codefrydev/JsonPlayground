import { describe, it, expect } from 'vitest';
import { encodeShare, decodeShare } from './share-state';

describe('share-state', () => {
  it('round-trips via lz compression', () => {
    const payload = { j: '{"a":1}', c: 'Dump(data.a);' };
    const encoded = encodeShare(payload);
    expect(decodeShare(encoded)).toEqual(payload);
  });

  it('decodes legacy base64 share param', () => {
    const payload = { j: '{"x":1}', c: 'Dump(data);' };
    const legacy = btoa(encodeURIComponent(JSON.stringify(payload)));
    expect(decodeShare(legacy)).toEqual(payload);
  });
});
