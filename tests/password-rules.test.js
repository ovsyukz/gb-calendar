import { describe, it, expect } from 'vitest';
import {
  checkNewPassword,
  MIN_PASSWORD_LENGTH,
} from '../public/js/lib/password-rules.js';
import { validatePassword } from '../netlify/functions/_lib/admin-validation.js';

const GOOD = 'a'.repeat(MIN_PASSWORD_LENGTH);

describe('checkNewPassword', () => {
  it('passes a long enough password typed the same way twice', () => {
    expect(checkNewPassword(GOOD, GOOD)).toBeNull();
  });

  it('catches a password one character short', () => {
    const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1);
    expect(checkNewPassword(short, short)).toMatch(/at least/i);
  });

  it('catches a mistyped confirmation', () => {
    expect(checkNewPassword(GOOD, `${GOOD}x`)).toMatch(/do not match/i);
  });

  it('complains about length first, so a short pair is not blamed on matching', () => {
    expect(checkNewPassword('short', 'different')).toMatch(/at least/i);
  });
});

describe('agreement with the server', () => {
  it('accepts and rejects the same lengths the server does', () => {
    // Two copies of one rule, in two languages of the same codebase. If the
    // server's minimum moves and this one does not, the browser starts
    // sending passwords the API will reject.
    for (const password of ['', 'short', GOOD, 'a'.repeat(40)]) {
      expect(checkNewPassword(password, password) === null).toBe(
        validatePassword(password) === null
      );
    }
  });
});
