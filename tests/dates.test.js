import { describe, it, expect } from 'vitest';
import {
  formatDate,
  parseDate,
  today,
  buildMonthGrid,
  coversDate,
  formatDayRange,
} from '../public/js/lib/dates.js';

describe('formatDate / parseDate', () => {
  it('zero-pads month and day', () => {
    expect(formatDate(2026, 7, 5)).toBe('2026-07-05');
  });

  it('round-trips', () => {
    expect(parseDate(formatDate(2026, 12, 31))).toEqual([2026, 12, 31]);
  });
});

describe('today', () => {
  it('uses local date parts, not UTC', () => {
    // 23:30 local on the 5th is the 6th in UTC. Reading the UTC date here
    // would highlight the wrong calendar cell for anyone west of Greenwich.
    expect(today(new Date(2026, 7, 5, 23, 30))).toBe('2026-08-05');
  });
});

describe('buildMonthGrid', () => {
  it('returns only whole weeks', () => {
    for (let month = 0; month < 12; month += 1) {
      for (const week of buildMonthGrid(2026, month)) {
        expect(week).toHaveLength(7);
      }
    }
  });

  it('starts every week on a Sunday', () => {
    const [firstWeek] = buildMonthGrid(2026, 7);
    expect(new Date(`${firstWeek[0].date}T00:00`).getDay()).toBe(0);
  });

  it('marks days from neighbouring months as outside', () => {
    // August 2026 starts on a Saturday, so the first row is mostly July.
    const [firstWeek] = buildMonthGrid(2026, 7);
    expect(firstWeek.filter((d) => d.inMonth)).toHaveLength(1);
    expect(firstWeek.at(-1)).toMatchObject({
      date: '2026-08-01',
      dayOfMonth: 1,
      inMonth: true,
    });
  });

  it('includes every day of the month exactly once', () => {
    const days = buildMonthGrid(2026, 8)
      .flat()
      .filter((d) => d.inMonth);
    expect(days).toHaveLength(30); // September
    expect(new Set(days.map((d) => d.date)).size).toBe(30);
  });
});

describe('coversDate', () => {
  const multiDay = { date: '2026-08-08', endDate: '2026-08-09' };
  const oneDay = { date: '2026-08-08' };

  it('covers every day of a range, inclusive', () => {
    expect(coversDate(multiDay, '2026-08-08')).toBe(true);
    expect(coversDate(multiDay, '2026-08-09')).toBe(true);
  });

  it('excludes days either side', () => {
    expect(coversDate(multiDay, '2026-08-07')).toBe(false);
    expect(coversDate(multiDay, '2026-08-10')).toBe(false);
  });

  it('treats a missing endDate as a single day', () => {
    expect(coversDate(oneDay, '2026-08-08')).toBe(true);
    expect(coversDate(oneDay, '2026-08-09')).toBe(false);
  });
});

describe('formatDayRange', () => {
  it('shows one number for a single day', () => {
    expect(formatDayRange('2026-07-25')).toBe('25');
  });

  it('shows a range within a month', () => {
    expect(formatDayRange('2026-08-08', '2026-08-09')).toBe('8–9');
  });

  it('names both months when the range straddles two', () => {
    expect(formatDayRange('2026-11-30', '2026-12-02')).toBe('30 Nov–2 Dec');
  });
});
