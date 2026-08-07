import { parseDate, today, MONTH_ABBR } from './dates.js';
import { splitTournaments } from './split-tournaments.js';

/**
 * Fills a <select> with the tournaments someone can still enter. Shared by
 * the public sign-up form and the admin's manual one, so the two can never
 * drift apart.
 *
 * Only upcoming tournaments are offered — signing up for one that has already
 * happened is never what anyone meant. A multi-day event stays selectable
 * until its final day passes, same rule the sidebar uses.
 */
export function fillTournamentOptions(select, tournaments) {
  // The store notifies on every change, including ones that have nothing to
  // do with this list, so hold on to whatever was already picked.
  const chosen = select.value;
  const { upcoming } = splitTournaments(tournaments, today());

  const placeholder = new Option(
    upcoming.length ? 'Select a tournament…' : 'No upcoming tournaments',
    ''
  );
  const options = upcoming.map((t) => new Option(optionLabel(t), t.id));

  select.replaceChildren(placeholder, ...options);
  select.value = chosen;
}

function optionLabel({ name, location, date }) {
  const [, month, day] = parseDate(date);
  const where = location ? ` — ${location}` : '';
  return `${name}${where} (${MONTH_ABBR[month - 1]} ${day})`;
}
