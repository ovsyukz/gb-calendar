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

/**
 * Cache the *promise*, not the resolved client. `client ??= await connect()`
 * looks equivalent but is not: two concurrent requests both see an unset
 * client and both open the data directory, which crashes the second one.
 * Storing the promise means every caller awaits the same connection.
 */
let connection;

async function connect() {
  const { PGlite } = await import('@electric-sql/pglite');
  // Tests set PGLITE_PATH=memory:// for a throwaway database per run.
  return new PGlite(process.env.PGLITE_PATH || '.pgdata');
}

function client() {
  connection ??= connect();
  return connection;
}

/** Flushes to disk so Ctrl-C does not leave the data directory half-written. */
export async function closeLocalDb() {
  if (!connection) return;
  await (await connection).close();
  connection = undefined;
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
  const db = await client();
  const { text, values: params } = toParameterised(strings, values);
  const { rows } = await db.query(text, params);
  return rows;
}

/** Used by the migration runner, which has raw SQL rather than a template. */
export async function localQuery(text) {
  const db = await client();
  return db.exec(text);
}
