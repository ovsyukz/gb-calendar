import { clone, fill } from '../lib/dom.js';
import { state } from '../state/store.js';

/**
 * One tournament as it appears inside a calendar day.
 *
 * For a visitor it is an <a> to the registration page, or inert text when
 * there is no link — never a div with a click handler, which is what the old
 * version used and which keyboard users could not reach.
 *
 * For a logged-in admin it becomes a button that opens the edit modal.
 */
export function eventChip(tournament, onEdit) {
  const node = clone('tpl-event-chip');
  const chip = node.querySelector('.chip');
  const arrow = node.querySelector('.chip-arrow');
  const primary = tournament.links?.[0];

  fill(node, { '.chip-name': tournament.name });

  const label = tournament.location
    ? `${tournament.name} · ${tournament.location}`
    : tournament.name;

  if (state.isAdmin) {
    chip.removeAttribute('target');
    chip.removeAttribute('rel');
    chip.href = '#';
    chip.title = `Edit ${label}`;
    arrow.textContent = '✎';
    chip.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onEdit(tournament);
    });
    return node;
  }

  if (primary) {
    chip.href = primary.url;
    chip.title = `${label} — opens ${primary.label.toLowerCase()} registration`;
  } else {
    chip.removeAttribute('target');
    chip.removeAttribute('rel');
    chip.title = label;
    arrow.remove();
  }

  return node;
}
