import { $, clone, fill, replaceChildren, toggle } from '../lib/dom.js';
import { groupAthletes } from '../lib/group-athletes.js';
import { state } from '../state/store.js';

/**
 * One row per person rather than per sign-up, so a competitor entered in
 * three tournaments appears once with all three listed.
 */
export function renderAthletes() {
  const athletes = groupAthletes(state.signups);

  toggle($('#athletes-empty'), athletes.length === 0);
  replaceChildren($('#athlete-list'), athletes.map(row));
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
