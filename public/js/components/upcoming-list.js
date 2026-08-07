import { $, clone, fill, replaceChildren, toggle } from '../lib/dom.js';
import { parseDate, formatDayRange, MONTH_ABBR } from '../lib/dates.js';
import { state, subscribe } from '../state/store.js';

/** The sidebar. Re-renders whenever an admin changes the tournament list. */
export function mountUpcoming() {
  const list = $('#upcoming-list');
  const empty = $('#upcoming-empty');

  function render() {
    const sorted = [...state.tournaments].sort((a, b) => a.date.localeCompare(b.date));
    toggle(empty, sorted.length === 0);
    replaceChildren(list, sorted.map(upcomingCard));
  }

  subscribe(render);
  render();
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
