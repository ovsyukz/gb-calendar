import { $, clone, fill, replaceChildren, toggle } from '../lib/dom.js';
import { groupAthletes } from '../lib/group-athletes.js';
import { state } from '../state/store.js';
import { ATHLETE_SORTS, sortAthletes } from '../lib/sort-rows.js';
import { mountSortSelect } from './sort-select.js';

let sortKey = 'name';

/**
 * One row per person rather than per sign-up, so a competitor entered in
 * three tournaments appears once with all three listed.
 */
export function renderAthletes() {
  mountSortSelect($('#athletes-sort'), ATHLETE_SORTS, sortKey, (key) => {
    sortKey = key;
    renderAthletes();
  });

  const athletes = groupAthletes(state.signups);

  toggle($('#athletes-empty'), athletes.length === 0);
  replaceChildren($('#athlete-list'), sortAthletes(athletes, sortKey).map(row));
}

function row(athlete) {
  const node = clone('tpl-athlete');
  const count = athlete.tournaments.length;

  fill(node, {
    '.athlete-name': athlete.name,
    '.athlete-contact': athlete.email ?? 'no email given',
    '.athlete-count': count === 1 ? '1 tournament' : `${count} tournaments`,
    '.athlete-tournaments': athlete.tournaments.join(' · '),
  });

  if (!athlete.email) node.querySelector('.athlete-contact').classList.add('is-missing');
  return node;
}
