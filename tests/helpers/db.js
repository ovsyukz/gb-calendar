import { readFile } from 'node:fs/promises';

/**
 * Shared setup for tests that exercise real SQL: an in-memory Postgres
 * (PGlite) with the production schema applied. Same statements that ship.
 */

process.env.PGLITE_PATH = 'memory://';
delete process.env.NETLIFY_DATABASE_URL;

const { localQuery } = await import('../../netlify/functions/_lib/local-db.js');

export const { sql } = await import('../../netlify/functions/_lib/db.js');
export const repo = await import('../../netlify/functions/_lib/signups-repo.js');

export async function applySchema() {
  await localQuery(await readFile('migrations/001_init.sql', 'utf8'));
}

export async function resetTables() {
  await localQuery('TRUNCATE athletes, signups RESTART IDENTITY CASCADE');
}

export async function countAthletes() {
  const [row] = await sql()`SELECT count(*)::int AS n FROM athletes`;
  return Number(row.n);
}
