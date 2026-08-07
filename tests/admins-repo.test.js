import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { sql, applySchema } from './helpers/db.js';
import { verifyPassword } from '../netlify/functions/_lib/passwords.js';

const { findAdmin, upsertAdmin, countAdmins, touchLastLogin } =
  await import('../netlify/functions/_lib/admins-repo.js');
const { localQuery } = await import('../netlify/functions/_lib/local-db.js');

beforeAll(applySchema);

beforeEach(async () => {
  await localQuery('TRUNCATE admins RESTART IDENTITY CASCADE');
});

describe('upsertAdmin', () => {
  it('stores a hash, never the password', async () => {
    await upsertAdmin('coach', 'a-good-password');

    const [row] = await sql()`SELECT password_hash FROM admins`;
    expect(row.password_hash).not.toContain('a-good-password');
    expect(await verifyPassword('a-good-password', row.password_hash)).toBe(true);
  });

  it('resets the password instead of creating a duplicate', async () => {
    await upsertAdmin('coach', 'first-password');
    await upsertAdmin('coach', 'second-password');

    expect(await countAdmins()).toBe(1);
    const { password_hash } = await findAdmin('coach');
    expect(await verifyPassword('second-password', password_hash)).toBe(true);
    expect(await verifyPassword('first-password', password_hash)).toBe(false);
  });

  it('treats usernames case-insensitively, so no lookalike accounts', async () => {
    await upsertAdmin('Coach', 'a-good-password');
    await upsertAdmin('coach', 'a-good-password');
    expect(await countAdmins()).toBe(1);
  });
});

describe('findAdmin', () => {
  it('finds regardless of case', async () => {
    await upsertAdmin('Sarah', 'a-good-password');
    expect(await findAdmin('SARAH')).not.toBeNull();
  });

  it('returns null for an unknown username', async () => {
    expect(await findAdmin('nobody')).toBeNull();
  });
});

describe('countAdmins', () => {
  it('starts at zero, which is what makes login fail closed', async () => {
    expect(await countAdmins()).toBe(0);
  });
});

describe('touchLastLogin', () => {
  it('records the time', async () => {
    await upsertAdmin('coach', 'a-good-password');
    const { id } = await findAdmin('coach');

    await touchLastLogin(id);
    const [row] = await sql()`SELECT last_login_at FROM admins WHERE id = ${id}`;
    expect(row.last_login_at).not.toBeNull();
  });
});
