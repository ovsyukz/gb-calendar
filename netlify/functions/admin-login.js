import { sessionCookie, json } from './_lib/auth.js';
import { verifyPassword } from './_lib/passwords.js';
import { findAdminByEmail, countAdmins, touchLastLogin } from './_lib/admins-repo.js';

export const config = { path: '/api/admin/login' };

// Verified against when the email is unknown, so a wrong email and a wrong
// password take the same time and cannot be told apart.
const DECOY = 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AA==';

export default async function adminLogin(request) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let email = '';
  let password = '';
  try {
    ({ email = '', password = '' } = await request.json());
  } catch {
    return json({ error: 'Expected a JSON body' }, 400);
  }

  if (!email || !password) {
    return json({ error: 'Enter an email and password.' }, 400);
  }

  if ((await countAdmins()) === 0) {
    // Fail closed. An empty table must never mean "let everyone in".
    console.error('No admin accounts exist; refusing all logins. Run: npm run admin:add');
    return json({ error: 'Admin login is not configured' }, 500);
  }

  const admin = await findAdminByEmail(email);
  const ok = await verifyPassword(password, admin?.password_hash ?? DECOY);

  if (!admin || !ok) {
    return json({ error: 'Incorrect email or password' }, 401);
  }

  await touchLastLogin(admin.id);

  // A pending session can do nothing but set a new password — see auth.js.
  return json(
    { ok: true, name: admin.name, mustChangePassword: admin.must_change_password },
    200,
    {
      'set-cookie': sessionCookie({
        adminId: admin.id,
        mustChangePassword: admin.must_change_password,
      }),
    }
  );
}
