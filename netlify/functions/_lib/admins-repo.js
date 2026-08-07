import { sql } from './db.js';

/**
 * Reading admin accounts. Writes live in admin-accounts.js.
 *
 * Removing an admin disables the row rather than deleting it, so every query
 * here filters on `disabled_at IS NULL`. A disabled account is invisible to
 * login, to the admin list, and to the last-admin count — as far as the app is
 * concerned it no longer exists, while the record survives for the created_by
 * references and the audit trail.
 */

/** Case-insensitive. Disabled accounts are not found, so they cannot log in. */
export async function findAdminByEmail(email) {
  const [row] = await sql()`
    SELECT id, name, email, password_hash, must_change_password
    FROM admins
    WHERE lower(email) = lower(${email}) AND disabled_at IS NULL
  `;
  return row ?? null;
}

/** True while the account still exists and has not been disabled. */
export async function isActiveAdmin(id) {
  const [row] = await sql()`
    SELECT 1 FROM admins WHERE id = ${id} AND disabled_at IS NULL
  `;
  return Boolean(row);
}

export async function listAdmins() {
  return sql()`
    SELECT id, name, email, must_change_password, created_at, last_login_at
    FROM admins WHERE disabled_at IS NULL ORDER BY lower(name)
  `;
}

export async function countAdmins() {
  const [row] = await sql()`
    SELECT count(*)::int AS n FROM admins WHERE disabled_at IS NULL
  `;
  return Number(row.n);
}

export async function touchLastLogin(id) {
  await sql()`UPDATE admins SET last_login_at = now() WHERE id = ${id}`;
}
