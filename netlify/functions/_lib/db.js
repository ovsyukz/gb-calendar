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
 *   a connection string set  → Netlify DB (managed Neon Postgres)
 *   none                     → embedded local Postgres in .pgdata/
 *
 * Two names are accepted. NETLIFY_DATABASE_URL is reserved by the Netlify
 * Database extension: a value you set under that name is silently discarded
 * and never reaches the function. DATABASE_URL is the one to set by hand.
 *
 * The local fallback means `npm run dev` works on a fresh clone with nothing
 * installed and no account anywhere. It is real Postgres, so behaviour
 * matches production; it is simply a different copy of the data.
 */

let remote;

const connectionString = () =>
  process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

export function isLocal() {
  return !connectionString();
}

/**
 * True when running as a deployed function, where the disk is read-only.
 *
 * NETLIFY is set during builds but not in the functions runtime, so testing
 * it alone let the guard below silently never fire in the one place it
 * exists for. AWS_LAMBDA_FUNCTION_NAME is what the runtime actually sets.
 * NETLIFY_DEV marks a local `netlify dev`, which does have a writable disk
 * and should keep falling back to .pgdata/.
 */
function isDeployed() {
  if (process.env.NETLIFY_DEV) return false;
  return Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
}

export function sql() {
  if (isLocal()) {
    // Netlify has no writable disk, so falling back to the embedded database
    // surfaces as "EROFS: read-only file system, mkdir '/var/task/.pgdata'"
    // from deep inside a query — which says nothing about the real problem.
    if (isDeployed()) {
      throw new Error(
        'No database configured: set DATABASE_URL in the Netlify site environment variables.'
      );
    }
    return localSql;
  }

  remote ??= neon(connectionString());
  return remote;
}
