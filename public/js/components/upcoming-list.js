import { $, clone, fill, replaceChildren, toggle } from '../lib/dom.js';
import { parseDate, formatDayRange, today, MONTH_ABBR } from '../lib/dates.js';
import { splitTournaments } from '../lib/split-tournaments.js';
import { state, subscribe } from '../state/store.js';

/**
 * The sidebar: what is coming up, and what finished in the last month.
 * Re-renders whenever an admin changes the tournament list.
 *
 * `onEdit(tournament)` comes from the tournament modal — the same handler the
 * calendar chips use, so editing from the list and from the grid are one path.
 */
export function mountUpcoming({ onEdit }) {
  function render() {
    const { upcoming, past } = splitTournaments(state.tournaments, today());

    toggle($('#upcoming-empty'), upcoming.length === 0);
    replaceChildren(
      $('#upcoming-list'),
      upcoming.map((t) => card(t, false, onEdit))
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

function card(tournament, isPast, onEdit) {
  const node = clone('tpl-upcoming-card');
  const [, month] = parseDate(tournament.date);

  fill(node, {
    '.badge-month': MONTH_ABBR[month - 1],
    '.badge-day': formatDayRange(tournament.date, tournament.endDate),
    '.card-name': tournament.name,
    '.card-location': tournament.location ?? '',
    '.card-notes': tournament.notes ?? '',
  });

  // An empty <span> would still take up margin; leave it out entirely.
  if (!tournament.notes) node.querySelector('.card-notes').remove();

  // A finished tournament keeps no links: registration is closed, so an
  // enabled-looking button would only lead somewhere useless.
  if (isPast) {
    node.classList.add('is-past');
    return node;
  }

  // Admin only. The button is hidden for a visitor rather than absent so the
  // card keeps one shape; the server refuses the write either way.
  const edit = node.querySelector('.card-edit');
  toggle(edit, state.isAdmin);
  if (state.isAdmin) {
    edit.title = `Edit ${tournament.name}`;
    edit.setAttribute('aria-label', `Edit ${tournament.name}`);
    edit.addEventListener('click', () => onEdit(tournament));
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
