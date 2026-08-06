import { TOURNAMENTS } from '../../../public/js/data/tournaments.js';

/**
 * The server validates sign-ups against the same tournament list the browser
 * renders, by importing the one constant file directly. No second copy to
 * drift out of sync.
 */
export const TOURNAMENT_IDS = TOURNAMENTS.map((t) => t.id);

export function tournamentName(id) {
  return TOURNAMENTS.find((t) => t.id === id)?.name ?? id;
}
