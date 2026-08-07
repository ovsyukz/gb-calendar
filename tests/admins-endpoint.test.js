import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { applySchema } from './helpers/db.js';

/**
 * The guards on DELETE /api/admins, exercised through the handler itself.
 *
 * The repo tests cover what disabling does to a row. These cover the rules
 * that decide whether it happens at all — the ones that keep you from locking
 * everyone out.
 */

process.env.SESSION_SECRET = 'a'.repeat(48);

const { default: admins } = await import('../netlify/functions/admins.js');
const { createToken } = await import('../netlify/functions/_lib/tokens.js');
const { findAdminByEmail, isActiveAdmin, countAdmins } =
  await import('../netlify/functions/_lib/admins-repo.js');
const { upsertAdmin } = await import('../netlify/functions/_lib/admin-accounts.js');
const { localQuery } = await import('../netlify/functions/_lib/local-db.js');

/** A DELETE request carrying a signed session for `adminId`. */
function removeRequest(targetId, adminId) {
  const headers = adminId ? { cookie: `gb_admin=${createToken({ sub: adminId })}` } : {};
  return new Request(`http://localhost/api/admins?id=${targetId}`, {
    method: 'DELETE',
    headers,
  });
}

const add = async (email) => {
  await upsertAdmin({ name: email, email, password: 'a-good-password' });
  return (await findAdminByEmail(email)).id;
};

beforeAll(applySchema);
beforeEach(async () => {
  await localQuery('TRUNCATE admins RESTART IDENTITY CASCADE');
});

describe('removing another admin', () => {
  it('disables them and returns the remaining list', async () => {
    const me = await add('me@example.com');
    const them = await add('them@example.com');

    const response = await admins(removeRequest(them, me));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(await isActiveAdmin(them)).toBe(false);
    expect(body.admins.map((a) => a.email)).toEqual(['me@example.com']);
  });
});

describe('guards', () => {
  it('refuses to remove your own account', async () => {
    const me = await add('me@example.com');
    await add('them@example.com');

    const response = await admins(removeRequest(me, me));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/your own account/i);
    expect(await isActiveAdmin(me)).toBe(true);
  });

  it('leaves no way to remove anyone when only one admin is left', async () => {
    // The self-check covers the last admin transitively: the only account you
    // could target is your own. This is the guarantee that matters — the site
    // can never be left with nobody able to sign in.
    const me = await add('only@example.com');
    expect(await countAdmins()).toBe(1);

    expect((await admins(removeRequest(me, me))).status).toBe(400);
    expect(await isActiveAdmin(me)).toBe(true);
  });

  it('refuses a request with no session', async () => {
    const them = await add('them@example.com');

    expect((await admins(removeRequest(them, null))).status).toBe(401);
    expect(await isActiveAdmin(them)).toBe(true);
  });

  it('refuses a session belonging to an already-removed admin', async () => {
    const me = await add('me@example.com');
    const them = await add('them@example.com');
    await admins(removeRequest(them, me)); // them is now disabled

    // Their cookie is still valid and unexpired, but the account is gone.
    expect((await admins(removeRequest(me, them))).status).toBe(401);
    expect(await isActiveAdmin(me)).toBe(true);
  });

  it('rejects a non-numeric id', async () => {
    const me = await add('me@example.com');

    expect((await admins(removeRequest('abc', me))).status).toBe(400);
  });
});
