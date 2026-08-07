import { session, sessionCookie, json, unauthorized } from './_lib/auth.js';
import { validatePassword } from './_lib/admin-validation.js';
import { setPassword } from './_lib/admin-accounts.js';

export const config = { path: '/api/admin/password' };

/**
 * The one endpoint a pending session may call — it is how an admin handed a
 * temporary password gets out of that state. Uses `session` rather than
 * `isAdmin` for exactly that reason.
 */
export default async function adminPassword(request) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const claims = session(request);
  if (!claims) return unauthorized();

  let password = '';
  try {
    ({ password = '' } = await request.json());
  } catch {
    return json({ error: 'Expected a JSON body' }, 400);
  }

  const problem = validatePassword(password);
  if (problem) return json({ error: problem }, 400);

  await setPassword(claims.sub, password);

  // Issue a fresh, no-longer-pending cookie so the new rights take effect
  // immediately rather than after the old token expires.
  return json({ ok: true }, 200, {
    'set-cookie': sessionCookie({ adminId: claims.sub, mustChangePassword: false }),
  });
}
