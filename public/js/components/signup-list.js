import { $, clone, fill, replaceChildren, toggle } from '../lib/dom.js';
import { removeSignup } from '../lib/api.js';
import { state } from '../state/store.js';
import { SIGNUP_SORTS, sortSignups } from '../lib/sort-rows.js';
import { mountSortSelect } from './sort-select.js';

let sortKey = 'newest';
let redraw = () => {};

/** One row per sign-up: who, which tournament, and a Remove button. */
export function renderSignups(onChange) {
  redraw = () => renderSignups(onChange);

  mountSortSelect($('#signups-sort'), SIGNUP_SORTS, sortKey, (key) => {
    sortKey = key;
    redraw();
  });

  toggle($('#participants-empty'), state.signups.length === 0);
  replaceChildren(
    $('#participant-list'),
    sortSignups(state.signups, sortKey).map((signup) => row(signup, onChange))
  );
}

function row(signup, onChange) {
  const node = clone('tpl-participant');
  const contact = signup.email ? ` · ${signup.email}` : '';

  fill(node, {
    '.participant-name': signup.name,
    '.participant-meta': `${signup.tournamentName}${contact}`,
  });

  node.querySelector('.participant-remove').addEventListener('click', async (event) => {
    event.target.disabled = true;
    await removeSignup(signup.id).catch(() => {});
    await onChange();
  });

  return node;
}
