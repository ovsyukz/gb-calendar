import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed session tokens. Format: `<payload>.<signature>`, where payload is
 * base64url JSON and signature is an HMAC-SHA256 of it.
 *
 * The token carries only an expiry — there is exactly one admin, so there is
 * no identity to encode. It is deliberately not a JWT: no algorithm field
 * means no algorithm-confusion attack to get wrong.
 */

export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error('SESSION_SECRET must be set to at least 32 characters');
  }
  return value;
}

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createToken(ttlSeconds = SESSION_TTL_SECONDS) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token) {
  if (typeof token !== 'string') return false;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload))) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof exp === 'number' && exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

/** Constant-time string compare — length mismatch is the one early exit. */
export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
