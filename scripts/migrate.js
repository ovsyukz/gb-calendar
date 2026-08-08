#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql, isLocal } from '../netlify/functions/_lib/db.js';
import { countAdmins } from '../netlify/functions/_lib/admins-repo.js';
import { upsertAdmin } from '../netlify/functions/_lib/admin-accounts.js';

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

/**
 * Wraps a raw statement as a tagged-template call with no interpolations.
 *
 * The Neon driver rejects anything else — it checks for a real
 * TemplateStringsArray (an array carrying a `.raw` array) and throws
 * otherwise. A bare [statement] silently works against the local driver,
 * which only reduces over the array, so the difference shows up in
 * production and nowhere else.
 */
const asTemplate = (text) => Object.assign([text], { raw: [text] });

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
    await run(asTemplate(statement));
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
//
// Override the credentials in .env if you like; the defaults exist so the
// project works with no .env at all.
if (isLocal() && (await countAdmins()) === 0) {
  const email = process.env.LOCAL_ADMIN_EMAIL || 'admin@local';
  const password = process.env.LOCAL_ADMIN_PASSWORD || 'localdev123';

  await upsertAdmin({
    name: process.env.LOCAL_ADMIN_NAME || 'Local Admin',
    email,
    password,
  });
  console.log(`\nSeeded a local admin — email "${email}", password "${password}".`);
  console.log('Local only. Production accounts come from: npm run admin:add\n');
}

process.exit(0);
