/**
 * A subscribe/dispatch store, standing in for the framework this app used to
 * carry. Components read `state`, call `setState`, and re-render themselves
 * when notified.
 *
 * `tournaments` starts as the seed list in public/js/data/tournaments.js and
 * is replaced by the server's merged list — seed plus any admin edits — as
 * soon as it arrives. The seed means the calendar draws immediately rather
 * than flashing empty while the request is in flight.
 */

const FIRST_MONTH = 6; // July 2026
const LAST_MONTH = 11; // December 2026
const YEAR = 2026;

const listeners = new Set();

export const BOUNDS = { first: FIRST_MONTH, last: LAST_MONTH, year: YEAR };

/**
 * The month to show on load: the current one, so today's date is visible
 * without clicking. Clamped to the calendar's window — before it opens the
 * page starts on July, after it closes on December.
 */
export function initialMonth(now = new Date()) {
  if (now.getFullYear() < YEAR) return FIRST_MONTH;
  if (now.getFullYear() > YEAR) return LAST_MONTH;
  return Math.min(Math.max(now.getMonth(), FIRST_MONTH), LAST_MONTH);
}

export const state = {
  monthIndex: initialMonth(),
  isAdmin: false,
  // Signed in with a temporary password: the toolbar stays hidden and every
  // privileged request is refused until it is replaced.
  mustChangePassword: false,
  signups: [],
  tournaments: [],
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
