import { sql } from './db.js';
import { hashPassword } from './passwords.js';

/**
 * Creating, changing, and removing admin accounts. Reads live in
 * admins-repo.js.
 */

/**
 * Adds an admin with a temporary password they must replace on first login.
 * `createdBy` is null for accounts made from the command line.
 *
 * Re-adding a disabled email revives that account rather than failing on the
 * unique index — otherwise removing someone would burn their address forever.
 */
export async function createAdmin({ name, email, password, createdBy = null }) {
  const passwordHash = await hashPassword(password);

  const [row] = await sql()`
    INSERT INTO admins (name, email, password_hash, must_change_password, created_by)
    VALUES (${name}, ${email}, ${passwordHash}, TRUE, ${createdBy})
    ON CONFLICT (lower(email)) DO UPDATE
      SET name = EXCLUDED.name,
          password_hash = EXCLUDED.password_hash,
          must_change_password = TRUE,
          created_by = EXCLUDED.created_by,
          disabled_at = NULL,
          disabled_by = NULL
      WHERE admins.disabled_at IS NOT NULL
    RETURNING id
  `;
  return row?.id ?? null; // null means an *active* admin already has that email
}

/**
 * Command-line use: creates an account or resets its password, without forcing
 * a change on next login. Also re-enables a disabled account, which is how you
 * get back in if the last admin was removed by mistake.
 */
export async function upsertAdmin({ name, email, password }) {
  const passwordHash = await hashPassword(password);

  await sql()`
    INSERT INTO admins (name, email, password_hash, must_change_password)
    VALUES (${name}, ${email}, ${passwordHash}, FALSE)
    ON CONFLICT (lower(email)) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          must_change_password = FALSE,
          disabled_at = NULL,
          disabled_by = NULL
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

/**
 * Disables an account. The row is never deleted: other admins reference it
 * through created_by, and who added whom is worth keeping.
 *
 * Returns false when the id is unknown or already disabled.
 */
export async function disableAdmin(id, disabledBy) {
  const rows = await sql()`
    UPDATE admins SET disabled_at = now(), disabled_by = ${disabledBy}
    WHERE id = ${id} AND disabled_at IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}
