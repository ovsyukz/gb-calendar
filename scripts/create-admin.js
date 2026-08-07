#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { upsertAdmin, findAdminByEmail } from '../netlify/functions/_lib/admins-repo.js';
import { validateNewAdmin } from '../netlify/functions/_lib/admin-validation.js';
import { isLocal } from '../netlify/functions/_lib/db.js';

/**
 * Creates the first admin, or resets an existing one's password.
 *
 * Day to day, admins add each other from the Admins dialog in the app. This
 * exists for the bootstrap case — an empty table, where nobody can log in yet
 * — and for the locked-out case, where nobody can reach that dialog.
 *
 * Prompts rather than taking arguments: a password on the command line ends
 * up in shell history and in the process list.
 *
 * Usage:  npm run admin:add
 */

const rl = createInterface({ input: stdin, output: stdout });

console.log(isLocal() ? '\nLocal database (.pgdata/)\n' : '\nNetlify DB\n');

const name = (await rl.question('Name: ')).trim();
const email = (await rl.question('Email: ')).trim();

const existing = await findAdminByEmail(email);
if (existing) {
  const confirm = await rl.question(
    `"${email}" already exists. Reset its password? [y/N] `
  );
  if (confirm.trim().toLowerCase() !== 'y') {
    console.log('Nothing changed.');
    process.exit(0);
  }
}

// Node cannot mask input on every terminal, so say plainly that it is visible
// rather than implying a privacy this cannot deliver.
const password = (await rl.question('Password (visible as you type): ')).trim();
rl.close();

const { error, value } = validateNewAdmin({ name, email, password });
if (error) {
  console.error(`\n${error}\n`);
  process.exit(1);
}

await upsertAdmin(value);

console.log(
  `\n${existing ? 'Password reset for' : 'Created admin'} ${value.name} <${value.email}>.`
);
console.log('Stored as a one-way scrypt hash — it cannot be read back.\n');
process.exit(0);
