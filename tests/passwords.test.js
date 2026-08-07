import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../netlify/functions/_lib/passwords.js';

describe('hashPassword', () => {
  it('never stores the password itself', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).not.toContain('correct horse battery staple');
  });

  it('produces a different hash every time, so equal passwords are not obvious', async () => {
    const [a, b] = await Promise.all([hashPassword('same'), hashPassword('same')]);
    expect(a).not.toBe(b);
  });

  it('records its parameters so the cost can be raised later', async () => {
    expect(await hashPassword('x')).toMatch(/^scrypt\$16384\$8\$1\$/);
  });
});

describe('verifyPassword', () => {
  it('accepts the right password', async () => {
    const hash = await hashPassword('localdev-password');
    expect(await verifyPassword('localdev-password', hash)).toBe(true);
  });

  it('rejects the wrong one', async () => {
    const hash = await hashPassword('localdev-password');
    expect(await verifyPassword('localdev-passwore', hash)).toBe(false);
  });

  it('is case sensitive', async () => {
    const hash = await hashPassword('Secret');
    expect(await verifyPassword('secret', hash)).toBe(false);
  });

  it('handles unicode and long passwords', async () => {
    const password = '🥋 çöl '.repeat(20);
    expect(await verifyPassword(password, await hashPassword(password))).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['not a hash', 'hunter2'],
    ['unknown scheme', 'bcrypt$1$2$3$4$5'],
    ['truncated', 'scrypt$16384$8$1$'],
    ['null', null],
    ['undefined', undefined],
  ])(
    'returns false rather than throwing for a %s stored value',
    async (_label, stored) => {
      expect(await verifyPassword('anything', stored)).toBe(false);
    }
  );

  it('rejects a hash whose salt was tampered with', async () => {
    const parts = (await hashPassword('secret')).split('$');
    parts[4] = Buffer.from('different-salt').toString('base64');
    expect(await verifyPassword('secret', parts.join('$'))).toBe(false);
  });
});
