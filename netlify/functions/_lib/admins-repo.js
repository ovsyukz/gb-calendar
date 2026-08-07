import { sql } from './db.js';
import { hashPassword } from './passwords.js';

/** Case-insensitive, matching the unique index in 004_admin_profiles.sql. */
export async function findAdminByEmail(email) {
  const [row] = await sql()`
    SELECT id, name, email, password_hash, must_change_password
    FROM admins WHERE lower(email) = lower(${email})
  `;
  return row ?? null;
}

/**
 * Adds an admin with a temporary password they must replace on first login.
 * `createdBy` is null for accounts made from the command line.
 */
export async function createAdmin({ name, email, password, createdBy = null }) {
  const passwordHash = await hashPassword(password);

  const [row] = await sql()`
    INSERT INTO admins (name, email, password_hash, must_change_password, created_by)
    VALUES (${name}, ${email}, ${passwordHash}, TRUE, ${createdBy})
    ON CONFLICT (lower(email)) DO NOTHING
    RETURNING id
  `;
  return row?.id ?? null; // null means the email was already taken
}

/**
 * Command-line use: creates an account or resets its password, without
 * forcing a change on next login — whoever ran the CLI chose the password
 * themselves, so there is nothing temporary about it.
 */
export async function upsertAdmin({ name, email, password }) {
  const passwordHash = await hashPassword(password);

  await sql()`
    INSERT INTO admins (name, email, password_hash, must_change_password)
    VALUES (${name}, ${email}, ${passwordHash}, FALSE)
    ON CONFLICT (lower(email))
    DO UPDATE SET password_hash = EXCLUDED.password_hash, must_change_password = FALSE
  `;
}

/** Sets a password and clears the must-change flag — the only way to clear it. */
export async function setPassword(id, password) {
  const passwordHash = await hashPassword(password);

  await sql()`
    UPDATE admins
    SET password_hash = ${passwordHash}, must_change_password = FALSE
    WHERE id = ${id}
  `;
}

export async function listAdmins() {
  return sql()`
    SELECT id, name, email, must_change_password, created_at, last_login_at
    FROM admins ORDER BY lower(name)
  `;
}

export async function countAdmins() {
  const [row] = await sql()`SELECT count(*)::int AS n FROM admins`;
  return Number(row.n);
}

export async function touchLastLogin(id) {
  await sql()`UPDATE admins SET last_login_at = now() WHERE id = ${id}`;
}
