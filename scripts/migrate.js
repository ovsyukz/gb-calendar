#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql, isLocal } from '../netlify/functions/_lib/db.js';
import { countAdmins, upsertAdmin } from '../netlify/functions/_lib/admins-repo.js';

/**
 * Applies every .sql file in migrations/ that has not run yet, in filename
 * order, recording each in schema_migrations.
 *
 * Works against the local embedded database or Netlify DB, whichever db.js
 * selects. Migrations are written to be idempotent, so re-running is safe.
 *
 * Usage:  npm run migrate
 */

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const run = sql();

console.log(isLocal() ? 'Using local database (.pgdata/)' : 'Using Netlify DB');

await run`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

const applied = new Set(
  (await run`SELECT name FROM schema_migrations`).map((r) => r.name)
);
const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

let count = 0;
for (const file of files) {
  if (applied.has(file)) continue;

  // Split on statement boundaries: the Neon HTTP driver takes one statement
  // at a time. Comment lines are dropped so a ';' inside one cannot split it.
  const statements = (await readFile(join(MIGRATIONS_DIR, file), 'utf8'))
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await run([statement]);
  }

  await run`INSERT INTO schema_migrations (name) VALUES (${file})`;
  console.log(`applied ${file}`);
  count += 1;
}

console.log(
  count === 0 ? 'Already up to date.' : `Done — ${count} migration(s) applied.`
);

// Local convenience only: a fresh clone can log in immediately. Guarded on
// isLocal() so this can never create an account against a real database —
// there, `npm run admin:add` is the only way in.
if (isLocal() && (await countAdmins()) === 0) {
  await upsertAdmin('admin', 'localdev');
  console.log('\nSeeded a local admin — username "admin", password "localdev".');
  console.log('Local only. Production accounts come from: npm run admin:add\n');
}

process.exit(0);
