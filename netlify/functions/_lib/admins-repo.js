import { sql } from './db.js';
import { hashPassword } from './passwords.js';

/** Case-insensitive, matching the unique index in 003_admins.sql. */
export async function findAdmin(username) {
  const [row] = await sql()`
    SELECT id, username, password_hash FROM admins WHERE lower(username) = lower(${username})
  `;
  return row ?? null;
}

/** Creates the account, or resets the password if the username already exists. */
export async function upsertAdmin(username, password) {
  const passwordHash = await hashPassword(password);

  await sql()`
    INSERT INTO admins (username, password_hash) VALUES (${username}, ${passwordHash})
    ON CONFLICT (lower(username)) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `;
}

export async function countAdmins() {
  const [row] = await sql()`SELECT count(*)::int AS n FROM admins`;
  return Number(row.n);
}

export async function touchLastLogin(id) {
  await sql()`UPDATE admins SET last_login_at = now() WHERE id = ${id}`;
}
