#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * Scans tracked files for credentials committed by accident.
 *
 * This repository already shipped a hardcoded admin password once; it is
 * still in the history. The point of this check is that it cannot happen a
 * second time without someone being told.
 *
 * Usage:  npm run check:secrets
 */

const RULES = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'an AWS access key'],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/, 'a GitHub token'],
  [/\bsk-[A-Za-z0-9]{20,}/, 'an API secret key'],
  [/postgres(ql)?:\/\/[^\s'"]*:[^\s'"@]+@/, 'a database URL with a password in it'],
  [
    // The leading [a-z_]* matters: \b does not match between "_" and a word
    // character, so a bare \bpassword would miss ADMIN_PASSWORD — which is
    // precisely the name this repository leaked the first time.
    /[a-z_]*(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"\n]{8,}['"]/i,
    'a hardcoded credential',
  ],
];

// Values that look like secrets but are not: placeholders, references to the
// environment, and the throwaway credentials used by tests and local setup.
const ALLOWED =
  /process\.env|import\.meta\.env|change-me|example\.com|your-|placeholder|localdev|\.repeat\(|scrypt\$|EXCLUDED|\$\{/i;

// Tests and docs deliberately contain password-shaped strings.
const SKIP =
  /^(tests\/|README|NETLIFY_TODO|REFACTOR_PLAN|\.env\.example|scripts\/check-secrets)/;

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && !SKIP.test(f));

const findings = [];

for (const file of tracked) {
  let lines;
  try {
    lines = readFileSync(file, 'utf8').split('\n');
  } catch {
    continue; // binary or unreadable
  }

  lines.forEach((line, index) => {
    if (ALLOWED.test(line)) return;
    for (const [pattern, what] of RULES) {
      if (pattern.test(line)) findings.push({ file, line: index + 1, what });
    }
  });
}

// A tracked .env is the most common way credentials escape.
if (tracked.includes('.env')) {
  findings.push({ file: '.env', line: 1, what: 'a tracked .env file' });
}

if (findings.length === 0) {
  console.log('✓ no secrets found in tracked files');
  process.exit(0);
}

console.error('\n✗ Possible secrets in tracked files:\n');
for (const { file, line, what } of findings) {
  console.error(`  ${file}:${line} — looks like ${what}`);
}
console.error('\nMove the value to an environment variable, or add it to the');
console.error('allow-list in scripts/check-secrets.js if it is a false positive.\n');
process.exit(1);
