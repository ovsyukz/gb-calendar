import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

/**
 * Serves a file from `root`, defaulting to index.html for directories.
 * Returns null when nothing matches, so the caller can send its own 404.
 */
export async function serveStatic(root, urlPath) {
  // normalize() collapses any ../ before it can escape the public directory.
  const relative = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(root, relative);

  try {
    if ((await stat(filePath)).isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    return null;
  }

  try {
    const body = await readFile(filePath);
    return new Response(body, {
      headers: {
        'content-type': TYPES[extname(filePath)] ?? 'application/octet-stream',
        // No caching locally, so an edit is always the thing you reload.
        'cache-control': 'no-store',
      },
    });
  } catch {
    return null;
  }
}
