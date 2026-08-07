import { $, clone, fill, replaceChildren, toggle } from '../lib/dom.js';
import { parseDate, formatDayRange, today, MONTH_ABBR } from '../lib/dates.js';
import { splitTournaments } from '../lib/split-tournaments.js';
import { state, subscribe } from '../state/store.js';

/**
 * The sidebar: what is coming up, and what finished in the last month.
 * Re-renders whenever an admin changes the tournament list.
 */
export function mountUpcoming() {
  function render() {
    const { upcoming, past } = splitTournaments(state.tournaments, today());

    toggle($('#upcoming-empty'), upcoming.length === 0);
    replaceChildren(
      $('#upcoming-list'),
      upcoming.map((t) => card(t, false))
    );

    // The whole Past section disappears when there is nothing recent, rather
    // than leaving an empty heading on the page.
    toggle($('#past-section'), past.length > 0);
    replaceChildren(
      $('#past-list'),
      past.map((t) => card(t, true))
    );
  }

  subscribe(render);
  render();
}

function card(tournament, isPast) {
  const node = clone('tpl-upcoming-card');
  const [, month] = parseDate(tournament.date);

  fill(node, {
    '.badge-month': MONTH_ABBR[month - 1],
    '.badge-day': formatDayRange(tournament.date, tournament.endDate),
    '.card-name': tournament.name,
    '.card-location': tournament.location ?? '',
  });

  // A finished tournament keeps no links: registration is closed, so an
  // enabled-looking button would only lead somewhere useless.
  if (isPast) {
    node.classList.add('is-past');
    return node;
  }

  replaceChildren(
    node.querySelector('.card-links'),
    (tournament.links ?? []).map(linkTo)
  );
  return node;
}

function linkTo({ label, url }) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  anchor.textContent = `${label} ↗`;
  return anchor;
}
