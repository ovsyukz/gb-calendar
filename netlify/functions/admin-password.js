import { session, sessionCookie, json, unauthorized } from './_lib/auth.js';
import { validatePassword } from './_lib/admin-validation.js';
import { setPassword } from './_lib/admin-accounts.js';
import { findAdminById } from './_lib/admins-repo.js';
import { verifyPassword } from './_lib/passwords.js';

export const config = { path: '/api/admin/password' };

/**
 * Setting a password. Serves two journeys, told apart by the session:
 *
 *   pending — an admin handed a temporary password, who cannot use the site
 *             until they replace it. This is the one endpoint such a session
 *             may call, which is why it uses `session` rather than `isAdmin`.
 *   full    — a settled admin changing their password by choice.
 *
 * A full session must re-enter the current password. It has already proved
 * possession of the browser, and that is exactly the point: a signed-in
 * screen left unattended must not be enough to change the password out from
 * under its owner. A pending session is not asked, because it typed the
 * temporary password moments ago at login and has nothing else to give.
 */
export default async function adminPassword(request) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const claims = session(request);
  if (!claims) return unauthorized();

  let currentPassword = '';
  let password = '';
  try {
    ({ currentPassword = '', password = '' } = await request.json());
  } catch {
    return json({ error: 'Expected a JSON body' }, 400);
  }

  const problem = validatePassword(password);
  if (problem) return json({ error: problem }, 400);

  if (!claims.pending) {
    const admin = await findAdminById(claims.sub);
    if (!admin) return unauthorized(); // removed while their cookie was still live

    if (!(await verifyPassword(currentPassword, admin.password_hash))) {
      // 400, not 401: the session is fine, the typing is not. A 401 here
      // reads to the client as "you have been signed out".
      return json({ error: 'That is not your current password.' }, 400);
    }
  }

  await setPassword(claims.sub, password);

  // Issue a fresh, no-longer-pending cookie so the new rights take effect
  // immediately rather than after the old token expires.
  return json({ ok: true }, 200, {
    'set-cookie': sessionCookie({ adminId: claims.sub, mustChangePassword: false }),
  });
}
