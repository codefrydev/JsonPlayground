import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

export interface SharePayload {
  j: string;
  c: string;
}

const LEGACY_MAX = 1800;
export const SHARE_MAX_LENGTH = 12000;

export function encodeShare(payload: SharePayload): string {
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodeShare(param: string): SharePayload | null {
  try {
    const lz = decompressFromEncodedURIComponent(param);
    if (lz) {
      const parsed = JSON.parse(lz) as SharePayload;
      if (typeof parsed?.j === 'string' && typeof parsed?.c === 'string') return parsed;
    }
  } catch {
    /* try legacy */
  }
  try {
    const decoded = JSON.parse(decodeURIComponent(atob(param))) as SharePayload;
    if (typeof decoded?.j === 'string' && typeof decoded?.c === 'string') return decoded;
  } catch {
    /* ignore */
  }
  return null;
}

export function buildShareUrl(origin: string, pathname: string, payload: SharePayload): string {
  const encoded = encodeShare(payload);
  if (encoded.length > SHARE_MAX_LENGTH) {
    throw new Error('CONTENT_TOO_LARGE');
  }
  return `${origin}${pathname}?s=${encodeURIComponent(encoded)}`;
}

export { LEGACY_MAX };
