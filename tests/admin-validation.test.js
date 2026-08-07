import { describe, it, expect } from 'vitest';
import {
  validateNewAdmin,
  validatePassword,
  MIN_PASSWORD_LENGTH,
} from '../netlify/functions/_lib/admin-validation.js';

const valid = {
  name: 'Alex Coach',
  email: 'alex@example.com',
  password: 'a-good-password',
};

describe('validateNewAdmin', () => {
  it('accepts a complete admin', () => {
    expect(validateNewAdmin(valid).value).toMatchObject({ email: 'alex@example.com' });
  });

  it('lowercases the email so lookalike accounts cannot be made', () => {
    expect(validateNewAdmin({ ...valid, email: 'Alex@Example.COM' }).value.email).toBe(
      'alex@example.com'
    );
  });

  it('trims the name', () => {
    expect(validateNewAdmin({ ...valid, name: '  Alex  ' }).value.name).toBe('Alex');
  });

  it('requires a name', () => {
    expect(validateNewAdmin({ ...valid, name: ' ' }).error).toMatch(/name/i);
  });

  it('rejects a malformed email', () => {
    expect(validateNewAdmin({ ...valid, email: 'not-an-email' }).error).toMatch(/email/i);
  });

  it('rejects a short temporary password', () => {
    expect(validateNewAdmin({ ...valid, password: 'short' }).error).toMatch(
      /12 characters/
    );
  });

  it('survives a missing body', () => {
    expect(validateNewAdmin(undefined).error).toBeTruthy();
  });
});

describe('validatePassword', () => {
  it('accepts one at the minimum length', () => {
    expect(validatePassword('x'.repeat(MIN_PASSWORD_LENGTH))).toBeNull();
  });

  it('rejects one character short', () => {
    expect(validatePassword('x'.repeat(MIN_PASSWORD_LENGTH - 1))).toMatch(
      /12 characters/
    );
  });

  it.each([undefined, null, 42, {}])('rejects %p rather than throwing', (value) => {
    expect(validatePassword(value)).toBeTruthy();
  });
});
