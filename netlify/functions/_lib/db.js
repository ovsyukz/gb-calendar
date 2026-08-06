import { neon } from '@netlify/neon';
import { localSql } from './local-db.js';

/**
 * Picks the database driver from the environment, and hands back the same
 * tagged-template interface either way:
 *
 *     await sql()`SELECT * FROM athletes WHERE email = ${email}`
 *
 * Interpolated values become bind parameters, never string concatenation, so
 * this is safe from SQL injection by construction. Never build a query by
 * adding strings together.
 *
 *   NETLIFY_DATABASE_URL set  → Netlify DB (managed Neon Postgres)
 *   unset                     → embedded local Postgres in .pgdata/
 *
 * The local fallback means `npm run dev` works on a fresh clone with nothing
 * installed and no account anywhere. It is real Postgres, so behaviour
 * matches production; it is simply a different copy of the data.
 */

let remote;

export function isLocal() {
  return !process.env.NETLIFY_DATABASE_URL;
}

export function sql() {
  if (isLocal()) return localSql;

  remote ??= neon();
  return remote;
}
