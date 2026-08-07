import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * The bridge between Node's http server and Netlify Functions.
 *
 * Functions v2 handlers take a standard Request and return a standard
 * Response, so running them locally needs no emulation — only an adapter
 * between the two shapes.
 */

/** Maps each function's declared config.path to its handler. */
export async function loadRoutes(functionsDir) {
  const files = (await readdir(functionsDir)).filter((f) => f.endsWith('.js'));
  const routes = new Map();

  for (const file of files) {
    const module = await import(join(functionsDir, file));
    if (module.config?.path) routes.set(module.config.path, module.default);
  }
  return routes;
}

export function toRequest(req, port) {
  const url = new URL(req.url, `http://localhost:${port}`);
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';

  return new Request(url, {
    method: req.method,
    headers: req.headers,
    // duplex is required when streaming a request body.
    body: hasBody ? req : undefined,
    duplex: 'half',
  });
}

export async function send(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}
