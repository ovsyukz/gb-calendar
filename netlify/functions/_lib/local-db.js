/**
 * The local development database: a real Postgres engine (PGlite) running
 * in-process, storing to .pgdata/ on disk. No install, no Docker, no server.
 *
 * It is the same SQL as production — the schema in migrations/ deliberately
 * avoids extensions so both can run it unchanged.
 *
 * Exposes the same tagged-template interface as the Neon driver, so
 * signups-repo.js cannot tell which one it is talking to:
 *
 *     await sql()`SELECT * FROM athletes WHERE id = ${id}`
 */

let client;

async function connect() {
  const { PGlite } = await import('@electric-sql/pglite');
  // Tests set PGLITE_PATH=memory:// for a throwaway database per run.
  return new PGlite(process.env.PGLITE_PATH || '.pgdata');
}

/** Turns a tagged template into a parameterised query: $1, $2, ... */
function toParameterised(strings, values) {
  const text = strings.reduce(
    (acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ''),
    ''
  );
  return { text, values };
}

export async function localSql(strings, ...values) {
  client ??= await connect();
  const { text, values: params } = toParameterised(strings, values);
  const { rows } = await client.query(text, params);
  return rows;
}

/** Used by the migration runner, which has raw SQL rather than a template. */
export async function localQuery(text) {
  client ??= await connect();
  return client.exec(text);
}
