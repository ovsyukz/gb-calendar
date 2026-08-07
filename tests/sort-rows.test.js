import { describe, it, expect } from 'vitest';
import { sortSignups, sortAthletes } from '../public/js/lib/sort-rows.js';

const signups = [
  { name: 'Zoe', tournamentName: 'IBJJF Chicago Open' },
  { name: 'Ana', tournamentName: 'Tap Cancer Out' },
  { name: 'Mia', tournamentName: 'IBJJF Chicago Open' },
];

const athletes = [
  { name: 'Zoe', tournaments: ['Tap Cancer Out'] },
  { name: 'Ana', tournaments: ['IBJJF Chicago Open', 'Tap Cancer Out'] },
  { name: 'Mia', tournaments: ['IBJJF Chicago Open', 'Tap Cancer Out', 'Fall Games'] },
];

describe('sortSignups', () => {
  it('leaves the server order alone for newest', () => {
    expect(sortSignups(signups, 'newest').map((s) => s.name)).toEqual([
      'Zoe',
      'Ana',
      'Mia',
    ]);
  });

  it('sorts by name', () => {
    expect(sortSignups(signups, 'name').map((s) => s.name)).toEqual([
      'Ana',
      'Mia',
      'Zoe',
    ]);
  });

  it('sorts by event, then by name within an event', () => {
    expect(sortSignups(signups, 'event').map((s) => s.name)).toEqual([
      'Mia',
      'Zoe',
      'Ana',
    ]);
  });

  it('does not reorder the caller’s array', () => {
    const original = [...signups];
    sortSignups(signups, 'name');
    expect(signups).toEqual(original);
  });
});

describe('sortAthletes', () => {
  it('sorts by name by default', () => {
    expect(sortAthletes(athletes, 'name').map((a) => a.name)).toEqual([
      'Ana',
      'Mia',
      'Zoe',
    ]);
  });

  it('sorts by first event, then name', () => {
    // Ana and Mia both start at IBJJF; Zoe's first is Tap Cancer Out.
    expect(sortAthletes(athletes, 'event').map((a) => a.name)).toEqual([
      'Ana',
      'Mia',
      'Zoe',
    ]);
  });

  it('sorts by how many tournaments they are in', () => {
    expect(sortAthletes(athletes, 'most').map((a) => a.name)).toEqual([
      'Mia',
      'Ana',
      'Zoe',
    ]);
  });

  it('survives an athlete with no tournaments', () => {
    const odd = [{ name: 'Empty', tournaments: [] }, ...athletes];
    expect(() => sortAthletes(odd, 'event')).not.toThrow();
    expect(sortAthletes(odd, 'most').at(-1).name).toBe('Empty');
  });

  it('does not reorder the caller’s array', () => {
    const original = [...athletes];
    sortAthletes(athletes, 'most');
    expect(athletes).toEqual(original);
  });
});
