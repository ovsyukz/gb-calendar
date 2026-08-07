#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Assembles public/index.html from the partials in src/.
 *
 * index.html had grown past 450 lines with every dialog and template in one
 * place, which made any change hard to locate. Each section now lives in its
 * own file and this stitches them together.
 *
 * Deliberately tiny: it resolves `<!-- include: path -->` and nothing else.
 * No templating language, no variables, no logic — those would be a bundler
 * by another name, and the point of this project is not having one.
 *
 * Usage:  npm run build
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'public', 'index.html');

const INCLUDE = /^([ \t]*)<!--\s*include:\s*(\S+?)\s*-->[ \t]*$/gm;

const BANNER = `<!--
  GENERATED FILE — do not edit.
  Built from src/ by scripts/build-html.js. Run: npm run build
-->
`;

/** Strips a partial's own indentation, then applies the caller's. */
function reindent(body, indent) {
  const lines = body.split('\n');
  const depths = lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)[0].length);
  const common = depths.length ? Math.min(...depths) : 0;

  return lines
    .map((line) => (line.trim() ? indent + line.slice(common) : ''))
    .join('\n')
    .trimEnd();
}

/** Resolves includes recursively so a partial may include another. */
async function expand(file, seen = []) {
  if (seen.includes(file)) {
    throw new Error(`Circular include: ${[...seen, file].join(' → ')}`);
  }

  const source = await readFile(join(SRC, file), 'utf8');
  const jobs = [...source.matchAll(INCLUDE)].map(async ([match, indent, path]) => ({
    match,
    // Re-indent to wherever the include sits, so a partial can be written at
    // its natural depth and still land correctly wherever it is used.
    body: reindent(await expand(path, [...seen, file]), indent),
  }));

  let output = source;
  for (const { match, body } of await Promise.all(jobs)) {
    output = output.replace(match, body);
  }
  return output;
}

export async function buildHtml() {
  const html = await expand('index.html');
  // Drop the shell's own explanatory comment; the banner replaces it.
  await writeFile(OUT, BANNER + html.replace(/^<!--[\s\S]*?-->\n/, ''));
  return html;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await buildHtml();
  console.log('Built public/index.html from src/');
}
