#!/usr/bin/env node
import { createServer } from 'node:http';
import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-files.js';
import { isLocal } from '../netlify/functions/_lib/db.js';
import { closeLocalDb } from '../netlify/functions/_lib/local-db.js';

/**
 * Local development server. Serves public/ and routes /api/* to the same
 * function handlers Netlify runs in production.
 *
 * Netlify Functions v2 handlers take a standard Request and return a standard
 * Response, so running them here needs no emulation — just a small adapter
 * between Node's http server and the fetch API.
 *
 * Usage:  npm run dev
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = join(ROOT, 'public');
const FUNCTIONS_DIR = join(ROOT, 'netlify', 'functions');
const PORT = Number(process.env.PORT ?? 8888);

/** Maps each function's declared config.path to its handler. */
async function loadRoutes() {
  const files = (await readdir(FUNCTIONS_DIR)).filter((f) => f.endsWith('.js'));
  const routes = new Map();

  for (const file of files) {
    const module = await import(join(FUNCTIONS_DIR, file));
    if (module.config?.path) routes.set(module.config.path, module.default);
  }
  return routes;
}

const routes = await loadRoutes();

function toRequest(req) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';

  return new Request(url, {
    method: req.method,
    headers: req.headers,
    body: hasBody ? req : undefined,
    duplex: 'half',
  });
}

async function send(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);

  try {
    const handler = routes.get(pathname);
    if (handler) return await send(res, await handler(toRequest(req), {}));

    // Netlify Forms posts to '/' in production; locally just acknowledge it
    // so the sign-up flow does not report a failure.
    if (req.method === 'POST' && pathname === '/')
      return await send(res, new Response(''));

    const file = await serveStatic(PUBLIC_DIR, pathname);
    if (file) return await send(res, file);

    res.writeHead(404).end('Not found');
  } catch (error) {
    console.error(`${req.method} ${pathname} failed:`, error);
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}).listen(PORT, () => {
  console.log(`\n  gb-calendar  →  http://localhost:${PORT}`);
  console.log(`  database:    ${isLocal() ? 'local (.pgdata/)' : 'Netlify DB'}`);
  console.log(`  routes:      ${[...routes.keys()].join(', ')}\n`);
});

// Flush the embedded database before exiting, so Ctrl-C cannot leave the
// data directory half-written.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await closeLocalDb().catch(() => {});
    process.exit(0);
  });
}
