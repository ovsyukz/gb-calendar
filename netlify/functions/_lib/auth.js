import { createToken, readToken, SESSION_TTL_SECONDS } from './tokens.js';

const COOKIE_NAME = 'gb_admin';

/**
 * Two grades of session:
 *
 *   full     — signed in, password settled, may do anything
 *   pending  — signed in with a temporary password; may only set a new one
 *
 * `isAdmin` is the gate for every privileged endpoint and deliberately
 * rejects a pending session, so a new admin cannot read sign-ups or add
 * anyone until they have replaced the password they were handed.
 */

function cookie(value, maxAge) {
  return [
    `${COOKIE_NAME}=${value}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${maxAge}`,
  ].join('; ');
}

export function sessionCookie({ adminId, mustChangePassword }) {
  return cookie(
    createToken({ sub: adminId, pending: Boolean(mustChangePassword) }),
    SESSION_TTL_SECONDS
  );
}

export function expiredCookie() {
  return cookie('', 0);
}

function readCookie(request, name) {
  const header = request.headers.get('cookie');
  if (!header) return null;

  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

/** The claims of any valid session, pending or not. */
export function session(request) {
  return readToken(readCookie(request, COOKIE_NAME));
}

/** The single source of truth for "may this request see or change anything?" */
export function isAdmin(request) {
  const claims = session(request);
  return Boolean(claims) && !claims.pending;
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

export function unauthorized() {
  return json({ error: 'Not authorised' }, 401);
}
