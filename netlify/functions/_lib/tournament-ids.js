import { listTournaments } from './tournaments-repo.js';

/**
 * The server validates sign-ups against the same merged list the browser
 * renders — seed file plus admin edits — so a tournament an admin just added
 * can be signed up for immediately, and a deleted one cannot.
 */
export async function tournamentIds() {
  return (await listTournaments()).map((t) => t.id);
}

export async function tournamentName(id) {
  const match = (await listTournaments()).find((t) => t.id === id);
  return match?.name ?? id;
}

/**
 * id → name for labelling a whole list of sign-ups. Fetches once rather than
 * once per row, which `tournamentName` in a loop would do.
 */
export async function tournamentNames() {
  return new Map((await listTournaments()).map((t) => [t.id, t.name]));
}
