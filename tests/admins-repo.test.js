import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { sql, applySchema } from './helpers/db.js';
import { verifyPassword } from '../netlify/functions/_lib/passwords.js';

const repo = await import('../netlify/functions/_lib/admins-repo.js');
const { localQuery } = await import('../netlify/functions/_lib/local-db.js');

const { findAdminByEmail, createAdmin, upsertAdmin, countAdmins } = repo;

const NEW_ADMIN = {
  name: 'Alex Coach',
  email: 'alex@example.com',
  password: 'temporary-one',
};

beforeAll(applySchema);
beforeEach(async () => {
  await localQuery('TRUNCATE admins RESTART IDENTITY CASCADE');
});

describe('createAdmin', () => {
  it('stores a hash, never the password', async () => {
    await createAdmin(NEW_ADMIN);

    const [row] = await sql()`SELECT password_hash FROM admins`;
    expect(row.password_hash).not.toContain('temporary-one');
    expect(await verifyPassword('temporary-one', row.password_hash)).toBe(true);
  });

  it('forces a password change on first login', async () => {
    await createAdmin(NEW_ADMIN);
    expect((await findAdminByEmail('alex@example.com')).must_change_password).toBe(true);
  });

  it('refuses a duplicate email instead of overwriting the account', async () => {
    await createAdmin(NEW_ADMIN);
    // Overwriting would let anyone reset a colleague's password by "adding" them.
    expect(await createAdmin({ ...NEW_ADMIN, password: 'another-one' })).toBeNull();
    expect(await countAdmins()).toBe(1);
  });

  it('records who created the account', async () => {
    await upsertAdmin({
      name: 'Owner',
      email: 'owner@example.com',
      password: 'a-good-one',
    });
    const owner = await findAdminByEmail('owner@example.com');

    const id = await createAdmin({ ...NEW_ADMIN, createdBy: owner.id });
    const [row] = await sql()`SELECT created_by FROM admins WHERE id = ${id}`;
    expect(Number(row.created_by)).toBe(Number(owner.id));
  });
});

describe('upsertAdmin', () => {
  it('does not force a change — the person running the CLI chose the password', async () => {
    await upsertAdmin({
      name: 'Owner',
      email: 'owner@example.com',
      password: 'a-good-one',
    });
    expect((await findAdminByEmail('owner@example.com')).must_change_password).toBe(
      false
    );
  });

  it('resets rather than duplicating', async () => {
    await upsertAdmin({
      name: 'Owner',
      email: 'owner@example.com',
      password: 'first-one-ok',
    });
    await upsertAdmin({
      name: 'Owner',
      email: 'OWNER@example.com',
      password: 'second-one-x',
    });

    expect(await countAdmins()).toBe(1);
    const { password_hash } = await findAdminByEmail('owner@example.com');
    expect(await verifyPassword('second-one-x', password_hash)).toBe(true);
  });
});
