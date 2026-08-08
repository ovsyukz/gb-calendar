import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { applySchema } from './helpers/db.js';

/**
 * POST /api/admin/password, exercised through the handler.
 *
 * The rule worth pinning down is that a settled admin must re-enter their
 * current password, while an admin still holding a temporary one must not be
 * asked for it — the same endpoint, told apart only by the session.
 */

process.env.SESSION_SECRET = 'a'.repeat(48);

const { default: adminPassword } = await import('../netlify/functions/admin-password.js');
const { createToken } = await import('../netlify/functions/_lib/tokens.js');
const { findAdminByEmail } = await import('../netlify/functions/_lib/admins-repo.js');
const { upsertAdmin, createAdmin, disableAdmin } =
  await import('../netlify/functions/_lib/admin-accounts.js');
const { verifyPassword } = await import('../netlify/functions/_lib/passwords.js');
const { localQuery } = await import('../netlify/functions/_lib/local-db.js');

const CURRENT = 'the-old-password';
const CHOSEN = 'the-new-password';

/** A POST carrying a session for `adminId`; pass null for no cookie at all. */
function changeRequest(body, adminId, { pending = false } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (adminId !== null) {
    headers.cookie = `gb_admin=${createToken({ sub: adminId, pending })}`;
  }
  return new Request('http://localhost/api/admin/password', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

/** A settled admin: password chosen, nothing owed. */
async function settledAdmin() {
  await upsertAdmin({ name: 'Me', email: 'me@example.com', password: CURRENT });
  return (await findAdminByEmail('me@example.com')).id;
}

const storedHash = async () => (await findAdminByEmail('me@example.com')).password_hash;

beforeAll(applySchema);
beforeEach(async () => {
  await localQuery('TRUNCATE admins RESTART IDENTITY CASCADE');
});

describe('a settled admin changing their own password', () => {
  it('accepts the change when the current password is right', async () => {
    const me = await settledAdmin();

    const response = await adminPassword(
      changeRequest({ currentPassword: CURRENT, password: CHOSEN }, me)
    );

    expect(response.status).toBe(200);
    expect(await verifyPassword(CHOSEN, await storedHash())).toBe(true);
    expect(await verifyPassword(CURRENT, await storedHash())).toBe(false);
  });

  it('refuses a wrong current password and leaves the old one working', async () => {
    const me = await settledAdmin();

    const response = await adminPassword(
      changeRequest({ currentPassword: 'not-it-at-all', password: CHOSEN }, me)
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/current password/i);
    expect(await verifyPassword(CURRENT, await storedHash())).toBe(true);
  });

  it('refuses when the current password is missing entirely', async () => {
    const me = await settledAdmin();

    const response = await adminPassword(changeRequest({ password: CHOSEN }, me));

    expect(response.status).toBe(400);
    expect(await verifyPassword(CURRENT, await storedHash())).toBe(true);
  });

  it('rejects a new password that is too short, before anything else', async () => {
    const me = await settledAdmin();

    const response = await adminPassword(
      changeRequest({ currentPassword: CURRENT, password: 'short' }, me)
    );

    expect(response.status).toBe(400);
    expect(await verifyPassword(CURRENT, await storedHash())).toBe(true);
  });
});

describe('an admin who owes a password change', () => {
  it('sets a password without being asked for the temporary one', async () => {
    // The pending session already proved the temporary password at login.
    await createAdmin({
      name: 'New',
      email: 'me@example.com',
      password: 'handed-to-them',
    });
    const them = (await findAdminByEmail('me@example.com')).id;

    const response = await adminPassword(
      changeRequest({ password: CHOSEN }, them, { pending: true })
    );

    expect(response.status).toBe(200);
    expect(await verifyPassword(CHOSEN, await storedHash())).toBe(true);
    expect((await findAdminByEmail('me@example.com')).must_change_password).toBe(false);
  });
});

describe('guards', () => {
  it('refuses a request with no session', async () => {
    await settledAdmin();

    const response = await adminPassword(
      changeRequest({ currentPassword: CURRENT, password: CHOSEN }, null)
    );

    expect(response.status).toBe(401);
    expect(await verifyPassword(CURRENT, await storedHash())).toBe(true);
  });

  it('refuses a session belonging to a removed admin', async () => {
    const me = await settledAdmin();
    await disableAdmin(me, me);

    const response = await adminPassword(
      changeRequest({ currentPassword: CURRENT, password: CHOSEN }, me)
    );

    expect(response.status).toBe(401);
  });

  it('rejects anything but POST', async () => {
    const me = await settledAdmin();
    const headers = { cookie: `gb_admin=${createToken({ sub: me })}` };
    const request = new Request('http://localhost/api/admin/password', { headers });

    expect((await adminPassword(request)).status).toBe(405);
  });
});
