import { $, clone, fill, replaceChildren, toggle } from '../lib/dom.js';
import { removeSignup } from '../lib/api.js';
import { state } from '../state/store.js';

/** One row per sign-up: who, which tournament, and a Remove button. */
export function renderSignups(onChange) {
  const list = $('#participant-list');
  toggle($('#participants-empty'), state.signups.length === 0);
  replaceChildren(
    list,
    state.signups.map((signup) => row(signup, onChange))
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
