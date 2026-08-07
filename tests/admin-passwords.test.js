import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { applySchema } from './helpers/db.js';
import { verifyPassword } from '../netlify/functions/_lib/passwords.js';

const repo = await import('../netlify/functions/_lib/admins-repo.js');
const { localQuery } = await import('../netlify/functions/_lib/local-db.js');

const { findAdminByEmail, createAdmin, setPassword, listAdmins } = repo;

const NEW_ADMIN = {
  name: 'Alex Coach',
  email: 'alex@example.com',
  password: 'temporary-one',
};

beforeAll(applySchema);
beforeEach(async () => {
  await localQuery('TRUNCATE admins RESTART IDENTITY CASCADE');
});

describe('setPassword', () => {
  it('clears the must-change flag, which is the only way out of it', async () => {
    const id = await createAdmin(NEW_ADMIN);
    await setPassword(id, 'chosen-by-them');

    const admin = await findAdminByEmail('alex@example.com');
    expect(admin.must_change_password).toBe(false);
    expect(await verifyPassword('chosen-by-them', admin.password_hash)).toBe(true);
    expect(await verifyPassword('temporary-one', admin.password_hash)).toBe(false);
  });
});

describe('listAdmins', () => {
  it('never includes the password hash', async () => {
    await createAdmin(NEW_ADMIN);
    expect(Object.keys((await listAdmins())[0])).not.toContain('password_hash');
  });
});
