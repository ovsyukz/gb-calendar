import { requireAdmin, json, unauthorized } from './_lib/auth.js';
import { validateNewAdmin } from './_lib/admin-validation.js';
import { listAdmins, countAdmins } from './_lib/admins-repo.js';
import { createAdmin, disableAdmin } from './_lib/admin-accounts.js';

export const config = { path: '/api/admins' };

/** Any settled admin may see the others, add more, and remove them. */
export default async function admins(request) {
  const claims = await requireAdmin(request);
  if (!claims) return unauthorized();

  switch (request.method) {
    case 'GET':
      return json({ admins: present(await listAdmins(), claims) });
    case 'POST':
      return create(request, claims);
    case 'DELETE':
      return remove(request, claims);
    default:
      return json({ error: 'Method not allowed' }, 405);
  }
}

async function create(request, claims) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected a JSON body' }, 400);
  }

  const { error, value } = validateNewAdmin(body);
  if (error) return json({ error }, 400);

  const id = await createAdmin({ ...value, createdBy: claims.sub });
  if (!id) return json({ error: 'An admin with that email already exists.' }, 409);

  return json({ ok: true, admins: present(await listAdmins(), claims) });
}

/**
 * Removing an admin disables the account; the row is never deleted.
 *
 * Two guards. You cannot remove yourself — an accident there locks you out of
 * the tools needed to undo it. And you cannot remove the last one, which would
 * leave the site with no way in short of the command line.
 */
async function remove(request, claims) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) return json({ error: 'A numeric id is required' }, 400);

  if (String(claims.sub) === id) {
    return json({ error: 'You cannot remove your own account.' }, 400);
  }

  if ((await countAdmins()) <= 1) {
    return json({ error: 'The last admin cannot be removed.' }, 400);
  }

  const removed = await disableAdmin(Number(id), claims.sub);
  if (!removed) return json({ error: 'No such admin' }, 404);

  return json({ ok: true, admins: present(await listAdmins(), claims) });
}

/**
 * Never returns password_hash — it does not leave the database.
 *
 * `isYou` lets the browser hide the Remove button on your own row. The server
 * refuses that anyway; this just stops offering a button that cannot work.
 */
function present(rows, claims) {
  return rows.map((row) => ({
    id: String(row.id),
    name: row.name,
    email: row.email,
    mustChangePassword: row.must_change_password,
    lastLoginAt: row.last_login_at,
    isYou: String(row.id) === String(claims.sub),
  }));
}
