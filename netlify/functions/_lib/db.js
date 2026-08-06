import { neon } from '@netlify/neon';

/**
 * One lazily-created connection to Netlify DB (managed Neon Postgres).
 *
 * `neon()` reads NETLIFY_DATABASE_URL, which Netlify injects automatically in
 * deployed environments. Locally it comes from .env — see .env.example.
 *
 * Queries are written as tagged templates:
 *
 *     await sql()`SELECT * FROM athletes WHERE email = ${email}`
 *
 * Interpolated values become bind parameters, not string concatenation, so
 * this is safe from SQL injection by construction. Never build a query by
 * adding strings together.
 */

let connection;

export function sql() {
  if (!connection) {
    if (!process.env.NETLIFY_DATABASE_URL) {
      throw new Error('NETLIFY_DATABASE_URL is not set — is the database provisioned?');
    }
    connection = neon();
  }
  return connection;
}
