import { describe, it, expect } from 'vitest';
import { validateTournament } from '../netlify/functions/_lib/tournament-validation.js';
import { mergeTournaments } from '../netlify/functions/_lib/merge-tournaments.js';

const valid = { id: 'ibjjf', name: 'IBJJF Chicago Open', date: '2026-08-08' };

const override = (extra = {}) => ({
  id: 'ibjjf',
  name: 'IBJJF Chicago Open',
  location: null,
  date: '2026-08-08',
  end_date: null,
  links: [],
  notes: null,
  deleted: false,
  ...extra,
});

describe('validating coach notes', () => {
  it('keeps a note', () => {
    const { value } = validateTournament({
      ...valid,
      notes: 'Gi only. Weigh-in Friday.',
    });
    expect(value.notes).toBe('Gi only. Weigh-in Friday.');
  });

  it('trims surrounding whitespace', () => {
    expect(
      validateTournament({ ...valid, notes: '  carpool at 6am  ' }).value.notes
    ).toBe('carpool at 6am');
  });

  it('stores nothing rather than an empty string when left blank', () => {
    expect(validateTournament({ ...valid, notes: '   ' }).value.notes).toBeNull();
    expect(validateTournament(valid).value.notes).toBeNull();
  });

  it('keeps line breaks, since a note may be a short list', () => {
    const notes = 'Gi only\nWeigh-in Friday\nCarpool at 6am';
    expect(validateTournament({ ...valid, notes }).value.notes).toBe(notes);
  });

  it('rejects one that is too long', () => {
    const error = validateTournament({ ...valid, notes: 'x'.repeat(501) }).error;
    expect(error).toMatch(/too long/i);
  });

  it('accepts one at the limit', () => {
    expect(
      validateTournament({ ...valid, notes: 'x'.repeat(500) }).error
    ).toBeUndefined();
  });
});

describe('notes through the merge', () => {
  it('reaches the browser when an admin has set one', () => {
    const [row] = mergeTournaments([], [override({ notes: 'Gi only' })]);
    expect(row.notes).toBe('Gi only');
  });

  it('is absent rather than null when there is none', () => {
    const [row] = mergeTournaments([], [override()]);
    expect(row).not.toHaveProperty('notes');
  });

  it('an edit can clear a note the seed list had', () => {
    const seed = [{ ...valid, notes: 'from the file', links: [] }];
    const [row] = mergeTournaments(seed, [override()]);
    expect(row).not.toHaveProperty('notes');
  });

  it('an edit can add a note to a seed tournament', () => {
    const seed = [{ ...valid, links: [] }];
    const [row] = mergeTournaments(seed, [override({ notes: 'bring your gi' })]);
    expect(row.notes).toBe('bring your gi');
  });
});
