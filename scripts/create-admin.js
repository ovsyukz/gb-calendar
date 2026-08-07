#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { upsertAdmin, findAdmin } from '../netlify/functions/_lib/admins-repo.js';
import { isLocal } from '../netlify/functions/_lib/db.js';

/**
 * Creates an admin account, or resets an existing one's password.
 *
 *   npm run admin:add
 *
 * Prompts rather than taking arguments: a password on the command line ends
 * up in shell history and in the process list.
 *
 * Usage:  npm run admin:add
 */

const MIN_LENGTH = 12;

const rl = createInterface({ input: stdin, output: stdout });

console.log(isLocal() ? '\nLocal database (.pgdata/)\n' : '\nNetlify DB\n');

const username = (await rl.question('Username: ')).trim();
if (!username) {
  console.error('A username is required.');
  process.exit(1);
}

const existing = await findAdmin(username);
if (existing) {
  const confirm = await rl.question(
    `"${username}" already exists. Reset its password? [y/N] `
  );
  if (confirm.trim().toLowerCase() !== 'y') {
    console.log('Nothing changed.');
    process.exit(0);
  }
}

// Node cannot mask input on every terminal, so say plainly that it is visible
// rather than implying a privacy this cannot deliver.
const password = (await rl.question('Password (visible as you type): ')).trim();
if (password.length < MIN_LENGTH) {
  console.error(`Use at least ${MIN_LENGTH} characters.`);
  process.exit(1);
}

await upsertAdmin(username, password);
rl.close();

console.log(`\n${existing ? 'Password reset for' : 'Created admin'} "${username}".`);
console.log('Stored as a one-way scrypt hash — it cannot be read back.\n');
process.exit(0);
