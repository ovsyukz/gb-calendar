import { parseDate, formatDayRange, MONTH_ABBR } from './dates.js';

/**
 * The next tournament the team is heading to.
 *
 * A multi-day event still counts while it is running, so the banner reads
 * "Happening now" on the second day of a two-day competition rather than
 * skipping ahead to the next one.
 */
export function nextTournament(tournaments, today) {
  return (
    [...tournaments]
      .filter((t) => (t.endDate || t.date) >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  );
}

/** The line under the page title. */
export function describeNext(tournament, today) {
  if (!tournament) return 'No upcoming tournaments on the calendar';

  const [, month] = parseDate(tournament.date);
  const when = `${MONTH_ABBR[month - 1]} ${formatDayRange(tournament.date, tournament.endDate)}`;
  const where = tournament.location ? ` · ${tournament.location}` : '';
  const lead = tournament.date <= today ? 'Happening now' : 'Next up';

  return `${lead}: ${tournament.name} · ${when}${where}`;
}
