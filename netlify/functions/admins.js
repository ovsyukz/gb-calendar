import { isAdmin, session, json, unauthorized } from './_lib/auth.js';
import { validateNewAdmin } from './_lib/admin-validation.js';
import { createAdmin, listAdmins } from './_lib/admins-repo.js';

export const config = { path: '/api/admins' };

/** Any settled admin may see the others and add more. Pending ones may not. */
export default async function admins(request) {
  if (!isAdmin(request)) return unauthorized();

  switch (request.method) {
    case 'GET':
      return json({ admins: (await listAdmins()).map(present) });
    case 'POST':
      return create(request);
    default:
      return json({ error: 'Method not allowed' }, 405);
  }
}

async function create(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected a JSON body' }, 400);
  }

  const { error, value } = validateNewAdmin(body);
  if (error) return json({ error }, 400);

  const id = await createAdmin({ ...value, createdBy: session(request).sub });
  if (!id) return json({ error: 'An admin with that email already exists.' }, 409);

  return json({ ok: true, admins: (await listAdmins()).map(present) });
}

/** Never returns password_hash — it does not leave the database. */
function present(row) {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    mustChangePassword: row.must_change_password,
    lastLoginAt: row.last_login_at,
  };
}
