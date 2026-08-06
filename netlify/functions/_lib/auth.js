import { createToken, verifyToken, SESSION_TTL_SECONDS } from './tokens.js';

const COOKIE_NAME = 'gb_admin';

/**
 * HttpOnly means JavaScript cannot read it, so an XSS bug cannot steal the
 * session. SameSite=Strict means it is never sent cross-site, which is what
 * stops CSRF against the admin DELETE endpoint.
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

export function sessionCookie() {
  return cookie(createToken(), SESSION_TTL_SECONDS);
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

/** The single source of truth for "is this request allowed to see sign-ups?" */
export function isAdmin(request) {
  return verifyToken(readCookie(request, COOKIE_NAME));
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
