import { describe, it, expect, beforeAll } from 'vitest';
import { createToken, verifyToken, safeEqual } from '../netlify/functions/_lib/tokens.js';

beforeAll(() => {
  process.env.SESSION_SECRET = 'a'.repeat(48);
});

describe('createToken / verifyToken', () => {
  it('accepts a token it just made', () => {
    expect(verifyToken(createToken())).toBe(true);
  });

  it('rejects an expired token', () => {
    expect(verifyToken(createToken(-1))).toBe(false);
  });

  it('rejects a tampered payload', () => {
    const [, signature] = createToken().split('.');
    const forged = Buffer.from(JSON.stringify({ exp: 9e9 })).toString('base64url');
    expect(verifyToken(`${forged}.${signature}`)).toBe(false);
  });

  it('rejects a token signed with a different secret', () => {
    const token = createToken();
    process.env.SESSION_SECRET = 'b'.repeat(48);
    expect(verifyToken(token)).toBe(false);
    process.env.SESSION_SECRET = 'a'.repeat(48);
  });

  it.each([undefined, null, '', 'garbage', 'a.b.c', {}])('rejects %p', (value) => {
    expect(verifyToken(value)).toBe(false);
  });

  it('refuses to sign without a long enough secret', () => {
    process.env.SESSION_SECRET = 'short';
    expect(() => createToken()).toThrow(/SESSION_SECRET/);
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
