import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fillTournamentOptions } from '../public/js/lib/tournament-options.js';

/**
 * The dropdown must never offer a tournament that has already happened.
 * A tiny stand-in for <select> keeps this a unit test — no DOM needed.
 */
class FakeSelect {
  constructor() {
    this.children = [];
    this.value = '';
  }
  replaceChildren(...nodes) {
    this.children = nodes;
  }
  get labels() {
    return this.children.map((o) => o.text);
  }
  get values() {
    return this.children.map((o) => o.value);
  }
}

const tournaments = [
  { id: 'past', name: 'Long Gone', date: '2026-06-01' },
  { id: 'yesterday', name: 'Just Missed', date: '2026-08-05' },
  { id: 'running', name: 'Two Dayer', date: '2026-08-05', endDate: '2026-08-07' },
  { id: 'soon', name: 'Chicago Open', location: 'Chicago, IL', date: '2026-09-05' },
];

beforeEach(() => {
  vi.useFakeTimers().setSystemTime(new Date(2026, 7, 6)); // 6 August 2026
  globalThis.Option = class {
    constructor(text, value) {
      this.text = text;
      this.value = value;
    }
  };
});

afterEach(() => vi.useRealTimers());

describe('fillTournamentOptions', () => {
  it('offers only tournaments that have not finished', () => {
    const select = new FakeSelect();
    fillTournamentOptions(select, tournaments);

    expect(select.values).toEqual(['', 'running', 'soon']);
  });

  it('keeps a multi-day event selectable while it is running', () => {
    const select = new FakeSelect();
    fillTournamentOptions(select, tournaments);

    // Started the 5th, ends the 7th, today is the 6th.
    expect(select.values).toContain('running');
  });

  it('drops one that ended yesterday', () => {
    const select = new FakeSelect();
    fillTournamentOptions(select, tournaments);

    expect(select.values).not.toContain('yesterday');
    expect(select.values).not.toContain('past');
  });

  it('labels each option with its date and location', () => {
    const select = new FakeSelect();
    fillTournamentOptions(select, tournaments);

    expect(select.labels).toContain('Chicago Open — Chicago, IL (Sep 5)');
  });

  it('says so when nothing is coming up', () => {
    const select = new FakeSelect();
    fillTournamentOptions(select, [tournaments[0]]);

    expect(select.labels).toEqual(['No upcoming tournaments']);
  });

  it('keeps the current selection across a re-render', () => {
    const select = new FakeSelect();
    select.value = 'soon';
    fillTournamentOptions(select, tournaments);

    expect(select.value).toBe('soon');
  });
});
