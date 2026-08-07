#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Concatenates src/styles/*.css into public/styles.css, in the order given by
 * src/styles.manifest.
 *
 * Sixteen small stylesheets were sixteen HTTP requests for sixteen kilobytes.
 * Splitting them is right for editing and wrong for serving, so the split
 * stays in src/ and the browser gets one file.
 *
 * No minifying, no autoprefixing, no preprocessing — the shipped CSS is the
 * CSS in the repo, just joined together, and each block keeps a comment
 * saying which file it came from.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STYLES = join(ROOT, 'src', 'styles');
const MANIFEST = join(ROOT, 'src', 'styles.manifest');
const OUT = join(ROOT, 'public', 'styles.css');

const BANNER = `/*
 * GENERATED FILE — do not edit.
 * Built from src/styles/ by scripts/build-css.js. Run: npm run build
 */
`;

export async function readManifest() {
  const text = await readFile(MANIFEST, 'utf8');
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

export async function buildCss() {
  const files = await readManifest();

  const blocks = await Promise.all(
    files.map(async (file) => {
      const css = (await readFile(join(STYLES, file), 'utf8')).trim();
      return `/* ── ${file} ${'─'.repeat(Math.max(0, 60 - file.length))} */\n${css}\n`;
    })
  );

  await writeFile(OUT, BANNER + '\n' + blocks.join('\n'));
  return files;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = await buildCss();
  console.log(`Built public/styles.css from ${files.length} stylesheets`);
}
