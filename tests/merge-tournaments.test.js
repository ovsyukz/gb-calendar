import { describe, it, expect } from 'vitest';
import { mergeTournaments } from '../netlify/functions/_lib/merge-tournaments.js';

const seed = [
  { id: 'ibjjf', name: 'IBJJF Chicago Open', date: '2026-08-08', links: [] },
  { id: 'gi-jul', name: 'Grappling Industries', date: '2026-07-25', links: [] },
];

const override = (id, extra = {}) => ({
  id,
  name: 'Edited',
  location: null,
  date: '2026-09-01',
  end_date: null,
  links: [],
  deleted: false,
  ...extra,
});

describe('mergeTournaments', () => {
  it('returns the seed list, date-sorted, when there are no edits', () => {
    expect(mergeTournaments(seed).map((t) => t.id)).toEqual(['gi-jul', 'ibjjf']);
  });

  it('lets an edit win over the seed entry', () => {
    const [, edited] = mergeTournaments(seed, [override('ibjjf')]);
    expect(edited.name).toBe('Edited');
    expect(edited.date).toBe('2026-09-01');
  });

  it('adds a tournament that only exists in the database', () => {
    const result = mergeTournaments(seed, [override('new-one')]);
    expect(result.map((t) => t.id)).toContain('new-one');
    expect(result).toHaveLength(3);
  });

  it('removes a seed entry via a tombstone', () => {
    const result = mergeTournaments(seed, [override('ibjjf', { deleted: true })]);
    expect(result.map((t) => t.id)).toEqual(['gi-jul']);
  });

  it('omits empty optional fields rather than setting them to null', () => {
    const [row] = mergeTournaments([], [override('x')]);
    expect(row).not.toHaveProperty('location');
    expect(row).not.toHaveProperty('endDate');
  });

  it('maps end_date to endDate so overrides match the seed shape', () => {
    const [row] = mergeTournaments([], [override('x', { end_date: '2026-09-02' })]);
    expect(row.endDate).toBe('2026-09-02');
  });

  it('defaults links to an empty list', () => {
    const [row] = mergeTournaments([], [override('x', { links: null })]);
    expect(row.links).toEqual([]);
  });
});
