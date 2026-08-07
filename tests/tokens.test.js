import { describe, it, expect, beforeAll } from 'vitest';
import { createToken, readToken, safeEqual } from '../netlify/functions/_lib/tokens.js';

beforeAll(() => {
  process.env.SESSION_SECRET = 'a'.repeat(48);
});

describe('createToken / readToken', () => {
  it('round-trips its claims', () => {
    const claims = readToken(createToken({ sub: 7, pending: true }));
    expect(claims).toMatchObject({ sub: 7, pending: true });
  });

  it('rejects an expired token', () => {
    expect(readToken(createToken({ sub: 1 }, -1))).toBeNull();
  });

  it('rejects a tampered payload', () => {
    // Flipping "pending" would be the way to skip a forced password change.
    const [, signature] = createToken({ sub: 1, pending: true }).split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: 1, pending: false, exp: 9e9 })
    ).toString('base64url');
    expect(readToken(`${forged}.${signature}`)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const token = createToken({ sub: 1 });
    process.env.SESSION_SECRET = 'b'.repeat(48);
    expect(readToken(token)).toBeNull();
    process.env.SESSION_SECRET = 'a'.repeat(48);
  });

  it.each([undefined, null, '', 'garbage', 'a.b.c', {}])('rejects %p', (value) => {
    expect(readToken(value)).toBeNull();
  });

  it('refuses to sign without a long enough secret', () => {
    process.env.SESSION_SECRET = 'short';
    expect(() => createToken({ sub: 1 })).toThrow(/SESSION_SECRET/);
    process.env.SESSION_SECRET = 'a'.repeat(48);
  });
});

describe('safeEqual', () => {
  it('matches identical strings', () => {
    expect(safeEqual('hunter2', 'hunter2')).toBe(true);
  });

  it('rejects different strings of the same length', () => {
    expect(safeEqual('hunter2', 'hunter3')).toBe(false);
  });

  it('rejects different lengths without throwing', () => {
    expect(safeEqual('short', 'much longer value')).toBe(false);
  });
});
