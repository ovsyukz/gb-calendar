import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateTournaments } from '../public/js/data/validate.js';
import { TOURNAMENTS } from '../public/js/data/tournaments.js';

const good = { id: 'ok', name: 'Good One', date: '2026-08-08' };

// Silence the console errors these tests deliberately provoke, and restore
// afterwards so each test sees only its own calls.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the real tournament list', () => {
  it('is valid', () => {
    expect(validateTournaments(TOURNAMENTS)).toHaveLength(TOURNAMENTS.length);
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('validateTournaments', () => {
  it('drops the bad entry and keeps the rest', () => {
    const result = validateTournaments([good, { name: 'No id or date' }]);
    expect(result).toEqual([good]);
  });

  it('names the offender in the message', () => {
    validateTournaments([{ name: 'Mystery Cup' }]);
    expect(console.error.mock.calls[0][0]).toContain('Mystery Cup');
  });

  it('rejects a malformed date', () => {
    expect(validateTournaments([{ ...good, date: '08/08/2026' }])).toEqual([]);
  });

  it('rejects an endDate before the start', () => {
    expect(validateTournaments([{ ...good, endDate: '2026-08-01' }])).toEqual([]);
  });

  it('rejects duplicate ids, keeping the first', () => {
    const result = validateTournaments([good, { ...good, name: 'Clash' }]);
    expect(result).toEqual([good]);
  });

  it('rejects a link missing its url', () => {
    expect(validateTournaments([{ ...good, links: [{ label: 'Register' }] }])).toEqual(
      []
    );
  });

  it('accepts an entry with no location and no links', () => {
    expect(validateTournaments([good])).toEqual([good]);
  });
});
