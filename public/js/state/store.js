/**
 * A subscribe/dispatch store, roughly 40 lines standing in for the framework
 * this app used to carry. Components read `state`, call `setState`, and
 * re-render themselves when notified.
 *
 * Note there are no tournaments here — those are a constant now
 * (public/js/data/tournaments.js), not state, so they cannot drift.
 */

const FIRST_MONTH = 6; // July 2026
const LAST_MONTH = 11; // December 2026

const listeners = new Set();

export const BOUNDS = { first: FIRST_MONTH, last: LAST_MONTH, year: 2026 };

export const state = {
  monthIndex: FIRST_MONTH,
  isAdmin: false,
  signups: [],
};

export function setState(patch) {
  Object.assign(state, patch);
  for (const listener of listeners) listener(state);
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Steps the visible month, clamped to the July–December window. */
export function stepMonth(delta) {
  const next = state.monthIndex + delta;
  if (next < FIRST_MONTH || next > LAST_MONTH) return;
  setState({ monthIndex: next });
}

export const canStepBack = () => state.monthIndex > FIRST_MONTH;
export const canStepForward = () => state.monthIndex < LAST_MONTH;
