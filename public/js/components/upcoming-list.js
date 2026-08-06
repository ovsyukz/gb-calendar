import { $, clone, fill, replaceChildren, toggle } from '../lib/dom.js';
import { parseDate, formatDayRange, MONTH_ABBR } from '../lib/dates.js';

/**
 * The sidebar. Rendered once at load — tournaments are a constant, so unlike
 * the calendar there is nothing here that changes as state does.
 */
export function mountUpcoming(tournaments) {
  const list = $('#upcoming-list');
  const empty = $('#upcoming-empty');

  const sorted = [...tournaments].sort((a, b) => a.date.localeCompare(b.date));

  toggle(empty, sorted.length === 0);
  replaceChildren(list, sorted.map(upcomingCard));
}

function upcomingCard(tournament) {
  const card = clone('tpl-upcoming-card');
  const [, month] = parseDate(tournament.date);

  fill(card, {
    '.badge-month': MONTH_ABBR[month - 1],
    '.badge-day': formatDayRange(tournament.date, tournament.endDate),
    '.card-name': tournament.name,
    '.card-location': tournament.location ?? '',
  });

  replaceChildren(
    card.querySelector('.card-links'),
    (tournament.links ?? []).map(linkTo)
  );
  return card;
}

function linkTo({ label, url }) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  anchor.textContent = `${label} ↗`;
  return anchor;
}
