import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { applySchema } from './helpers/db.js';
import { verifyPassword } from '../netlify/functions/_lib/passwords.js';

const { findAdminByEmail, countAdmins } =
  await import('../netlify/functions/_lib/admins-repo.js');
const { createAdmin, upsertAdmin, disableAdmin } =
  await import('../netlify/functions/_lib/admin-accounts.js');
const { localQuery } = await import('../netlify/functions/_lib/local-db.js');

const make = (email, name = 'Someone') =>
  upsertAdmin({ name, email, password: 'a-good-password' });

beforeAll(applySchema);
beforeEach(async () => {
  await localQuery('TRUNCATE admins RESTART IDENTITY CASCADE');
});

describe('re-adding a removed email', () => {
  it('revives the account rather than colliding on the unique index', async () => {
    await make('back@example.com');
    const first = await findAdminByEmail('back@example.com');
    await disableAdmin(first.id, null);

    const revived = await createAdmin({
      name: 'Back Again',
      email: 'back@example.com',
      password: 'a-new-password',
    });

    expect(revived).not.toBeNull();
    expect(await countAdmins()).toBe(1);

    const admin = await findAdminByEmail('back@example.com');
    expect(await verifyPassword('a-new-password', admin.password_hash)).toBe(true);
    expect(admin.must_change_password).toBe(true);
  });

  it('still refuses an email an active admin holds', async () => {
    await make('taken@example.com');
    const again = await createAdmin({
      name: 'Impostor',
      email: 'taken@example.com',
      password: 'another-password',
    });
    expect(again).toBeNull();
  });
});
