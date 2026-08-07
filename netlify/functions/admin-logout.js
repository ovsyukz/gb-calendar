import { expiredCookie, json } from './_lib/auth.js';

export const config = { path: '/api/admin/logout' };

export default async function adminLogout(request) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  return json({ ok: true }, 200, { 'set-cookie': expiredCookie() });
}
