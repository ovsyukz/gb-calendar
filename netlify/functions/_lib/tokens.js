import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed session tokens. Format: `<payload>.<signature>`, where payload is
 * base64url JSON and signature is an HMAC-SHA256 of it.
 *
 * The payload carries the admin's id and whether they still owe us a password
 * change, so a half-authenticated session is a property of the token rather
 * than a database lookup on every request.
 *
 * Deliberately not a JWT: no algorithm field means no algorithm-confusion
 * attack to get wrong.
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

export function createToken(claims, ttlSeconds = SESSION_TTL_SECONDS) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = Buffer.from(JSON.stringify({ ...claims, exp })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** Returns the claims, or null if the token is missing, forged, or expired. */
export function readToken(token) {
  if (typeof token !== 'string') return null;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  if (!safeEqual(signature, sign(payload))) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof claims?.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

/** Constant-time string compare — length mismatch is the one early exit. */
export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
