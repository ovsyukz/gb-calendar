import { describe, it, expect } from 'vitest';
import { initialMonth, BOUNDS } from '../public/js/state/store.js';

const JULY = 6;
const DECEMBER = 11;

describe('initialMonth', () => {
  it('opens on the current month so today is visible without clicking', () => {
    expect(initialMonth(new Date(2026, 7, 6))).toBe(7); // August
    expect(initialMonth(new Date(2026, 9, 31))).toBe(9); // October
  });

  it('clamps to July for dates before the calendar window', () => {
    expect(initialMonth(new Date(2026, 0, 15))).toBe(JULY);
    expect(initialMonth(new Date(2025, 11, 31))).toBe(JULY);
  });

  it('clamps to December for dates after it', () => {
    expect(initialMonth(new Date(2027, 2, 1))).toBe(DECEMBER);
  });

  it('never returns a month outside the bounds', () => {
    for (let month = 0; month < 12; month += 1) {
      const result = initialMonth(new Date(2026, month, 1));
      expect(result).toBeGreaterThanOrEqual(BOUNDS.first);
      expect(result).toBeLessThanOrEqual(BOUNDS.last);
    }
  });
});
