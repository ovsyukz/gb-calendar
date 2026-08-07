#!/usr/bin/env node
import { createServer } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-files.js';
import { loadRoutes, toRequest, send } from './dev-functions.js';
import { buildHtml } from './build-html.js';
import { buildCss } from './build-css.js';
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

const routes = await loadRoutes(FUNCTIONS_DIR);

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);

  try {
    const handler = routes.get(pathname);
    if (handler) return await send(res, await handler(toRequest(req, PORT), {}));

    // Netlify Forms posts to '/' in production; locally just acknowledge it
    // so the sign-up flow does not report a failure.
    if (req.method === 'POST' && pathname === '/')
      return await send(res, new Response(''));

    // Rebuild on every request for the page or the stylesheet, so editing
    // anything in src/ shows up on refresh rather than needing a restart.
    // A handful of small file reads — cheaper than the round trip after it.
    if (pathname === '/' || pathname === '/index.html') await buildHtml();
    if (pathname === '/styles.css') await buildCss();

    const file = await serveStatic(PUBLIC_DIR, pathname);
    if (file) return await send(res, file);

    res.writeHead(404).end('Not found');
  } catch (error) {
    console.error(`${req.method} ${pathname} failed:`, error);
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

// Without this the failure is an unhandled 'error' event and a stack trace,
// and the old server keeps serving stale data on the port — which looks like
// the app being broken rather than a second copy running.
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already in use — is another dev server running?`);
    console.error(`  Stop it with:  pkill -f scripts/dev-server\n`);
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, () => {
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
