/**
 * JWT decode, verify, and encode using jose.
 */

import * as jose from 'jose';

export type DecodeResult =
  | { ok: true; header: Record<string, unknown>; payload: Record<string, unknown> }
  | { ok: false; error: string };

export function decodeJwt(token: string): DecodeResult {
  const trimmed = token.trim();
  if (!trimmed) {
    return { ok: false, error: 'Empty token' };
  }
  try {
    const header = jose.decodeProtectedHeader(trimmed);
    const payload = jose.decodeJwt(trimmed) as Record<string, unknown>;
    return { ok: true, header: header as Record<string, unknown>, payload };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Invalid JWT',
    };
  }
}

export type VerifyResult = { ok: true } | { ok: false; error: string };

export async function verifyJwt(token: string, secret: string): Promise<VerifyResult> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, error: 'Empty token' };
  if (!secret.trim()) return { ok: false, error: 'No secret provided' };
  try {
    const key = new TextEncoder().encode(secret);
    await jose.jwtVerify(trimmed, key);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Verification failed',
    };
  }
}

export type EncodeResult = { ok: true; jwt: string } | { ok: false; error: string };

export async function encodeJwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  secret: string,
  alg: string = 'HS256'
): Promise<EncodeResult> {
  if (!secret.trim()) {
    return { ok: false, error: 'Secret is required to sign the token' };
  }
  try {
    const key = new TextEncoder().encode(secret);
    const typ = (header.typ as string) || 'JWT';
    const jwt = await new jose.SignJWT(payload as jose.JWTPayload)
      .setProtectedHeader({ alg, typ })
      .sign(key);
    return { ok: true, jwt };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Encode failed',
    };
  }
}

/** Example secret used by generateExampleJwt; matching this in the decoder shows "Signature Verified". */
export const EXAMPLE_SECRET = 'a-string-secret-at-least-256-bits-long';

/** Generate a sample HS256 JWT for the "Generate example" button. */
export async function generateExampleJwt(): Promise<string> {
  const header = { alg: 'HS256' as const, typ: 'JWT' };
  const payload = {
    sub: '1234567890',
    name: 'John Doe',
    admin: true,
    iat: 1516239022,
  };
  const result = await encodeJwt(
    header as unknown as Record<string, unknown>,
    payload,
    EXAMPLE_SECRET,
    'HS256'
  );
  if (!result.ok) throw new Error(result.error);
  return result.jwt;
}
