import { parseDate, formatDate } from './dates.js';

/**
 * How far back the "Past Tournaments" list reaches. Older events drop off
 * entirely rather than accumulating forever.
 */
const MONTHS_OF_HISTORY = 1;

/**
 * The date one month before `today`. Day-of-month rollover is left to Date —
 * 31 March becomes 3 March rather than 31 February — which is close enough
 * for a cutoff and avoids inventing calendar rules.
 */
export function monthsAgo(today, months = MONTHS_OF_HISTORY) {
  const [year, month, day] = parseDate(today);
  const shifted = new Date(year, month - 1 - months, day);
  return formatDate(shifted.getFullYear(), shifted.getMonth() + 1, shifted.getDate());
}

/** A tournament is over once its last day has passed. */
const lastDay = (tournament) => tournament.endDate || tournament.date;

/**
 * Splits the list into what is still ahead and what has recently finished.
 *
 * Upcoming runs soonest first, the natural "what do I sign up for next"
 * order. Past runs most recent first, since that is the one people ask about.
 */
export function splitTournaments(tournaments, today) {
  const cutoff = monthsAgo(today);

  const upcoming = tournaments
    .filter((t) => lastDay(t) >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const past = tournaments
    .filter((t) => lastDay(t) < today && lastDay(t) >= cutoff)
    .sort((a, b) => b.date.localeCompare(a.date));

  return { upcoming, past };
}
