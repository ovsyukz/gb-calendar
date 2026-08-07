import { sessionCookie, json } from './_lib/auth.js';
import { verifyPassword } from './_lib/passwords.js';
import { findAdmin, countAdmins, touchLastLogin } from './_lib/admins-repo.js';

export const config = { path: '/api/admin/login' };

export default async function adminLogin(request) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let username = '';
  let password = '';
  try {
    ({ username = '', password = '' } = await request.json());
  } catch {
    return json({ error: 'Expected a JSON body' }, 400);
  }

  if (!username || !password) {
    return json({ error: 'Enter a username and password.' }, 400);
  }

  if ((await countAdmins()) === 0) {
    // Fail closed. An empty table must never mean "let everyone in".
    console.error('No admin accounts exist; refusing all logins. Run: npm run admin:add');
    return json({ error: 'Admin login is not configured' }, 500);
  }

  const admin = await findAdmin(username);

  // Verify against a decoy when the username is unknown, so a wrong username
  // and a wrong password take the same time and cannot be told apart.
  const stored = admin?.password_hash ?? 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AA==';
  const ok = await verifyPassword(password, stored);

  if (!admin || !ok) {
    return json({ error: 'Incorrect username or password' }, 401);
  }

  await touchLastLogin(admin.id);
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie() });
}
