import { describe, it, expect } from 'vitest';
import { nextTournament, describeNext } from '../public/js/lib/next-tournament.js';

const list = [
  { id: 'jul', name: 'Grappling Industries', date: '2026-07-25' },
  {
    id: 'aug',
    name: 'IBJJF Chicago Open',
    location: 'Chicago, IL',
    date: '2026-08-08',
    endDate: '2026-08-09',
  },
  { id: 'oct', name: 'Tap Cancer Out', date: '2026-10-10' },
];

describe('nextTournament', () => {
  it('picks the soonest one still ahead', () => {
    expect(nextTournament(list, '2026-08-01').id).toBe('aug');
  });

  it('skips ones that have passed', () => {
    expect(nextTournament(list, '2026-09-01').id).toBe('oct');
  });

  it('keeps a multi-day event while it is running', () => {
    // The 9th is the second day of IBJJF; it should not jump to October.
    expect(nextTournament(list, '2026-08-09').id).toBe('aug');
  });

  it('includes one starting today', () => {
    expect(nextTournament(list, '2026-07-25').id).toBe('jul');
  });

  it('returns null once they are all over', () => {
    expect(nextTournament(list, '2027-01-01')).toBeNull();
  });

  it('returns null for an empty calendar', () => {
    expect(nextTournament([], '2026-08-01')).toBeNull();
  });

  it('does not reorder the caller’s array', () => {
    const original = [...list];
    nextTournament(list, '2026-08-01');
    expect(list).toEqual(original);
  });
});

describe('describeNext', () => {
  it('names the tournament, its dates, and where it is', () => {
    const text = describeNext(nextTournament(list, '2026-08-01'), '2026-08-01');
    expect(text).toBe('Next up: IBJJF Chicago Open · Aug 8–9 · Chicago, IL');
  });

  it('says it is happening now once it has started', () => {
    expect(describeNext(nextTournament(list, '2026-08-09'), '2026-08-09')).toMatch(
      /^Happening now:/
    );
  });

  it('omits the location when there is none', () => {
    expect(describeNext(nextTournament(list, '2026-07-01'), '2026-07-01')).toBe(
      'Next up: Grappling Industries · Jul 25'
    );
  });

  it('says so when nothing is coming', () => {
    expect(describeNext(null, '2027-01-01')).toMatch(/No upcoming tournaments/);
  });
});
