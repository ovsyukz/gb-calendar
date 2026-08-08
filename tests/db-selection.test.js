import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Which driver db.js picks, and — the part that actually bit us — whether a
 * deployed function fails with a sentence a human can act on.
 *
 * Production ran for a while returning "EROFS: read-only file system, mkdir
 * '/var/task/.pgdata'" with a 502, because the guard tested NETLIFY, which
 * the functions runtime does not set. The clear message never appeared in
 * the one situation it was written for.
 *
 * Every case here leaves the connection string unset, so nothing in this
 * file can reach a real database.
 */

const CONNECTION_VARS = ['NETLIFY_DATABASE_URL', 'DATABASE_URL'];
const RUNTIME_VARS = ['NETLIFY', 'NETLIFY_DEV', 'AWS_LAMBDA_FUNCTION_NAME'];

let saved;

beforeEach(() => {
  saved = {};
  for (const key of [...CONNECTION_VARS, ...RUNTIME_VARS]) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  vi.resetModules();
});

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const load = () => import('../netlify/functions/_lib/db.js');

describe('isLocal', () => {
  it('is local when no connection string is set', async () => {
    const { isLocal } = await load();
    expect(isLocal()).toBe(true);
  });

  it('is not local when DATABASE_URL is set', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@example.invalid/db';
    const { isLocal } = await load();
    expect(isLocal()).toBe(false);
  });

  it('is not local when NETLIFY_DATABASE_URL is set', async () => {
    process.env.NETLIFY_DATABASE_URL = 'postgresql://u:p@example.invalid/db';
    const { isLocal } = await load();
    expect(isLocal()).toBe(false);
  });
});

describe('sql, with no database configured', () => {
  it('names the missing variable when deployed as a function', async () => {
    // What the runtime actually sets. Testing NETLIFY instead is what let a
    // 502 reach the site.
    process.env.AWS_LAMBDA_FUNCTION_NAME = 'tournaments';
    const { sql } = await load();
    expect(() => sql()).toThrow(/DATABASE_URL/);
  });

  it('still names it during a build, where NETLIFY is set', async () => {
    process.env.NETLIFY = 'true';
    const { sql } = await load();
    expect(() => sql()).toThrow(/DATABASE_URL/);
  });

  it('falls back to the local database under netlify dev', async () => {
    // netlify dev sets both NETLIFY and NETLIFY_DEV, and has a writable
    // disk, so it should behave like any other local run.
    process.env.NETLIFY = 'true';
    process.env.NETLIFY_DEV = 'true';
    const { sql } = await load();
    expect(() => sql()).not.toThrow();
  });

  it('falls back to the local database on a developer machine', async () => {
    const { sql } = await load();
    expect(() => sql()).not.toThrow();
  });
});
