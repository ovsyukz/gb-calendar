import { sessionCookie, json } from './_lib/auth.js';
import { safeEqual } from './_lib/tokens.js';

export const config = { path: '/api/admin/login' };

export default async function adminLogin(request) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    // Fail closed. A missing password must never mean "let everyone in".
    console.error('ADMIN_PASSWORD is not set; refusing all logins');
    return json({ error: 'Admin login is not configured' }, 500);
  }

  let submitted = '';
  try {
    ({ password: submitted = '' } = await request.json());
  } catch {
    return json({ error: 'Expected a JSON body' }, 400);
  }

  if (!safeEqual(submitted, expected)) {
    return json({ error: 'Incorrect password' }, 401);
  }

  return json({ ok: true }, 200, { 'set-cookie': sessionCookie() });
}
