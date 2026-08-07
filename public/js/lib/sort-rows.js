/**
 * Sorting for the admin lists. Pure functions over already-fetched rows —
 * the lists are small enough that sorting in the browser beats a round trip.
 *
 * Every sort is stable and falls back to name, so rows never appear to
 * shuffle at random when two share a key.
 */

const byName = (a, b) => a.name.localeCompare(b.name);

export const SIGNUP_SORTS = {
  newest: 'Newest first',
  name: 'Name',
  event: 'Event',
};

export function sortSignups(signups, key) {
  const rows = [...signups];

  switch (key) {
    case 'name':
      return rows.sort(byName);
    case 'event':
      return rows.sort(
        (a, b) => a.tournamentName.localeCompare(b.tournamentName) || byName(a, b)
      );
    default:
      // The server already returns newest first; keep that order untouched.
      return rows;
  }
}

export const ATHLETE_SORTS = {
  name: 'Name',
  event: 'Event',
  most: 'Most tournaments',
};

export function sortAthletes(athletes, key) {
  const rows = [...athletes];

  switch (key) {
    case 'event':
      // An athlete can be in several; order by the first one listed.
      return rows.sort(
        (a, b) =>
          (a.tournaments[0] ?? '').localeCompare(b.tournaments[0] ?? '') || byName(a, b)
      );
    case 'most':
      return rows.sort(
        (a, b) => b.tournaments.length - a.tournaments.length || byName(a, b)
      );
    default:
      return rows.sort(byName);
  }
}
