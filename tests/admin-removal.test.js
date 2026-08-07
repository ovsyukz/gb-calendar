import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { sql, applySchema } from './helpers/db.js';

const { findAdminByEmail, isActiveAdmin, listAdmins, countAdmins } =
  await import('../netlify/functions/_lib/admins-repo.js');
const { upsertAdmin, disableAdmin } =
  await import('../netlify/functions/_lib/admin-accounts.js');
const { localQuery } = await import('../netlify/functions/_lib/local-db.js');

const make = (email, name = 'Someone') =>
  upsertAdmin({ name, email, password: 'a-good-password' });

beforeAll(applySchema);
beforeEach(async () => {
  await localQuery('TRUNCATE admins RESTART IDENTITY CASCADE');
});

describe('disableAdmin', () => {
  it('keeps the row — removal is a disable, never a delete', async () => {
    await make('gone@example.com');
    const { id } = await findAdminByEmail('gone@example.com');

    await disableAdmin(id, null);

    const [row] = await sql()`SELECT email, disabled_at FROM admins WHERE id = ${id}`;
    expect(row.email).toBe('gone@example.com');
    expect(row.disabled_at).not.toBeNull();
  });

  it('records who did it', async () => {
    await make('boss@example.com');
    await make('gone@example.com');
    const boss = await findAdminByEmail('boss@example.com');
    const gone = await findAdminByEmail('gone@example.com');

    await disableAdmin(gone.id, boss.id);

    const [row] = await sql()`SELECT disabled_by FROM admins WHERE id = ${gone.id}`;
    expect(Number(row.disabled_by)).toBe(Number(boss.id));
  });

  it('reports false when already disabled, so a repeat is not a silent no-op', async () => {
    await make('gone@example.com');
    const { id } = await findAdminByEmail('gone@example.com');

    expect(await disableAdmin(id, null)).toBe(true);
    expect(await disableAdmin(id, null)).toBe(false);
  });
});

describe('a disabled admin', () => {
  let id;
  beforeEach(async () => {
    await make('gone@example.com');
    ({ id } = await findAdminByEmail('gone@example.com'));
    await disableAdmin(id, null);
  });

  it('cannot be found by email, so cannot log in', async () => {
    expect(await findAdminByEmail('gone@example.com')).toBeNull();
  });

  it('fails the active check, which revokes an open session', async () => {
    expect(await isActiveAdmin(id)).toBe(false);
  });

  it('disappears from the list', async () => {
    expect(await listAdmins()).toHaveLength(0);
  });

  it('does not count toward the last-admin guard', async () => {
    expect(await countAdmins()).toBe(0);
  });
});
