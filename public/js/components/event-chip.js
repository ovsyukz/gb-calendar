import { clone, fill } from '../lib/dom.js';

/**
 * One tournament as it appears inside a calendar day.
 *
 * It is an <a> when there is somewhere to go, and inert text when there is
 * not — rather than a div with a click handler, which is what the old version
 * used and which keyboard users could not reach.
 */
export function eventChip(tournament) {
  const node = clone('tpl-event-chip');
  const link = node.querySelector('.chip');
  const arrow = node.querySelector('.chip-arrow');
  const primary = tournament.links?.[0];

  fill(node, { '.chip-name': tournament.name });

  const label = tournament.location
    ? `${tournament.name} · ${tournament.location}`
    : tournament.name;

  if (primary) {
    link.href = primary.url;
    link.title = `${label} — opens ${primary.label.toLowerCase()} registration`;
  } else {
    link.removeAttribute('target');
    link.removeAttribute('rel');
    link.title = label;
    arrow.remove();
  }

  return node;
}
