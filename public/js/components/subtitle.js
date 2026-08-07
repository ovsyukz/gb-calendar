import { $ } from '../lib/dom.js';
import { today } from '../lib/dates.js';
import { nextTournament, describeNext } from '../lib/next-tournament.js';
import { state, subscribe } from '../state/store.js';

/**
 * The line under the page title. Follows the tournament list rather than
 * being written into the markup, so it stays true when an admin adds or
 * removes something, and when a tournament simply passes.
 */
export function mountSubtitle() {
  const element = $('#subtitle');

  function render() {
    const now = today();
    element.textContent = describeNext(nextTournament(state.tournaments, now), now);
  }

  subscribe(render);
  render();
}
