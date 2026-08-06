import { describe, it, expect } from 'vitest';
import { validateSignup } from '../netlify/functions/_lib/validation.js';

const IDS = ['ibjjf', 'gi-jul'];
const valid = { name: 'Sarah A', email: 'sarah@example.com', tournamentId: 'ibjjf' };

describe('validateSignup', () => {
  it('accepts a complete sign-up', () => {
    expect(validateSignup(valid, IDS).value).toEqual(valid);
  });

  it('accepts a sign-up with no email', () => {
    const { value } = validateSignup({ ...valid, email: '' }, IDS);
    expect(value.email).toBeNull();
  });

  it('turns a whitespace-only email into null, not an empty string', () => {
    const { value } = validateSignup({ ...valid, email: '   ' }, IDS);
    expect(value.email).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    const { value } = validateSignup({ ...valid, name: '  Sarah A  ' }, IDS);
    expect(value.name).toBe('Sarah A');
  });

  it('requires a name', () => {
    expect(validateSignup({ ...valid, name: '  ' }, IDS).error).toMatch(/name/i);
  });

  it('requires a tournament', () => {
    expect(validateSignup({ ...valid, tournamentId: '' }, IDS).error).toMatch(
      /tournament/i
    );
  });

  it('rejects a tournament that is not on the calendar', () => {
    expect(validateSignup({ ...valid, tournamentId: 'made-up' }, IDS).error).toBeTruthy();
  });

  it('rejects a malformed email when one is given', () => {
    expect(validateSignup({ ...valid, email: 'not-an-email' }, IDS).error).toMatch(
      /email/i
    );
  });

  it('rejects an over-long name', () => {
    expect(validateSignup({ ...valid, name: 'x'.repeat(101) }, IDS).error).toBeTruthy();
  });

  it('survives a missing body', () => {
    expect(validateSignup(undefined, IDS).error).toBeTruthy();
  });
});
