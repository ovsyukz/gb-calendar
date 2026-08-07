import { describe, it, expect } from 'vitest';
import { splitTournaments, monthsAgo } from '../public/js/lib/split-tournaments.js';

const t = (id, date, endDate) => ({
  id,
  name: id,
  date,
  ...(endDate ? { endDate } : {}),
});

const list = [
  t('jun', '2026-06-20'), // more than a month ago
  t('jul', '2026-07-25'), // within the last month
  t('aug', '2026-08-08', '2026-08-09'),
  t('sep', '2026-09-05'),
];

const TODAY = '2026-08-06';

describe('monthsAgo', () => {
  it('goes back one calendar month', () => {
    expect(monthsAgo('2026-08-06')).toBe('2026-07-06');
  });

  it('crosses a year boundary', () => {
    expect(monthsAgo('2026-01-15')).toBe('2025-12-15');
  });
});

describe('splitTournaments', () => {
  const { upcoming, past } = splitTournaments(list, TODAY);

  it('puts everything still ahead in upcoming, soonest first', () => {
    expect(upcoming.map((x) => x.id)).toEqual(['aug', 'sep']);
  });

  it('keeps only the last month in past, most recent first', () => {
    // June is older than the one-month window, so it drops off entirely.
    expect(past.map((x) => x.id)).toEqual(['jul']);
  });

  it('counts a multi-day event as upcoming until its final day passes', () => {
    const onDayTwo = splitTournaments(list, '2026-08-09');
    expect(onDayTwo.upcoming.map((x) => x.id)).toContain('aug');

    const dayAfter = splitTournaments(list, '2026-08-10');
    expect(dayAfter.past.map((x) => x.id)).toContain('aug');
  });

  it('treats a tournament starting today as upcoming', () => {
    expect(splitTournaments(list, '2026-09-05').upcoming.map((x) => x.id)).toEqual([
      'sep',
    ]);
  });

  it('handles an empty calendar', () => {
    expect(splitTournaments([], TODAY)).toEqual({ upcoming: [], past: [] });
  });

  it('never puts the same tournament in both lists', () => {
    const ids = new Set([...upcoming, ...past].map((x) => x.id));
    expect(ids.size).toBe(upcoming.length + past.length);
  });

  it('does not reorder the caller’s array', () => {
    const original = [...list];
    splitTournaments(list, TODAY);
    expect(list).toEqual(original);
  });
});
