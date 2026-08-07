import { sql } from './db.js';
import { mergeTournaments } from './merge-tournaments.js';
import { TOURNAMENTS as SEED } from '../../../public/js/data/tournaments.js';

/** Every tournament the site should show: seed list plus admin edits. */
export async function listTournaments() {
  const overrides = await sql()`SELECT * FROM tournament_overrides`;
  return mergeTournaments(SEED, overrides);
}

export async function saveTournament(tournament) {
  const { id, name, location, date, endDate, links, notes } = tournament;

  await sql()`
    INSERT INTO tournament_overrides (id, name, location, date, end_date, links, notes, deleted)
    VALUES (${id}, ${name}, ${location}, ${date}, ${endDate}, ${JSON.stringify(links)}, ${notes}, false)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, location = EXCLUDED.location, date = EXCLUDED.date,
      end_date = EXCLUDED.end_date, links = EXCLUDED.links, notes = EXCLUDED.notes,
      deleted = false, updated_at = now()
  `;
}

/**
 * Deleting a seed entry cannot remove it from the file, so it is recorded as
 * a tombstone that the merge filters out. A database-only tournament gets
 * the same treatment — simpler than branching, and it keeps a trace.
 */
export async function deleteTournament(id) {
  await sql()`
    INSERT INTO tournament_overrides (id, deleted) VALUES (${id}, true)
    ON CONFLICT (id) DO UPDATE SET deleted = true, updated_at = now()
  `;
}
