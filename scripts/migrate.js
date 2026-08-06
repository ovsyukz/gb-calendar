#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

/**
 * Runs every .sql file in migrations/ that has not been applied yet, in
 * filename order, and records each one in schema_migrations.
 *
 * Statements run one at a time rather than in a single transaction, because
 * the Neon HTTP driver does not accept multi-statement SQL. Every migration
 * is therefore written to be idempotent (CREATE ... IF NOT EXISTS), so a
 * half-applied migration is fixed by running this again.
 *
 * Usage:  npm run migrate
 */

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

const url = process.env.NETLIFY_DATABASE_URL;
if (!url) {
  console.error('NETLIFY_DATABASE_URL is not set. Copy .env.example to .env first.');
  process.exit(1);
}

const sql = neon(url);

await sql`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

const applied = new Set(
  (await sql`SELECT name FROM schema_migrations`).map((row) => row.name)
);
const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

let count = 0;
for (const file of files) {
  if (applied.has(file)) continue;

  const statements = (await readFile(join(MIGRATIONS_DIR, file), 'utf8'))
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
  }

  await sql`INSERT INTO schema_migrations (name) VALUES (${file})`;
  console.log(`applied ${file}`);
  count += 1;
}

console.log(
  count === 0 ? 'Already up to date.' : `Done — ${count} migration(s) applied.`
);
