import { parseDate, MONTH_ABBR } from './dates.js';

/**
 * Fills a <select> with the tournament list. Shared by the public sign-up
 * form and the admin's manual one, so the two can never drift apart.
 */
export function fillTournamentOptions(select, tournaments) {
  // The store notifies on every change, including ones that have nothing to
  // do with this list, so hold on to whatever was already picked.
  const chosen = select.value;

  const placeholder = new Option('Select a tournament…', '');
  const options = [...tournaments]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((tournament) => new Option(optionLabel(tournament), tournament.id));

  select.replaceChildren(placeholder, ...options);
  select.value = chosen;
}

function optionLabel({ name, location, date }) {
  const [, month, day] = parseDate(date);
  const where = location ? ` — ${location}` : '';
  return `${name}${where} (${MONTH_ABBR[month - 1]} ${day})`;
}
