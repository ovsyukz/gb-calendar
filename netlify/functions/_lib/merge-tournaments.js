/**
 * Combines the seed list from tournaments.js with the admin's edits.
 *
 * Pure and dependency-free, so the rule "database wins, tombstones remove"
 * can be tested without a database.
 */

function fromRow(row) {
  const tournament = {
    id: row.id,
    name: row.name,
    date: row.date,
    links: row.links ?? [],
  };
  // Optional fields are omitted rather than set to null, so an override has
  // the same shape as a seed entry and the UI needs no special cases.
  if (row.location) tournament.location = row.location;
  if (row.end_date) tournament.endDate = row.end_date;
  if (row.notes) tournament.notes = row.notes;
  return tournament;
}

export function mergeTournaments(seed, overrides = []) {
  const byId = new Map(seed.map((t) => [t.id, t]));

  for (const row of overrides) {
    if (row.deleted) byId.delete(row.id);
    else byId.set(row.id, fromRow(row));
  }

  return [...byId.values()].sort((a, b) => a.date.localeCompare(b.date));
}
