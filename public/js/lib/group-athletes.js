/**
 * Turns the flat sign-up list into one entry per person.
 *
 * Grouped on athleteId rather than name or email: two competitors can share a
 * name, and an athlete who skipped the email field has none to group on. The
 * database already decided who is who — this just respects that.
 */
export function groupAthletes(signups) {
  const byAthlete = new Map();

  for (const signup of signups) {
    const existing = byAthlete.get(signup.athleteId);
    if (existing) {
      existing.tournaments.push(signup.tournamentName);
      continue;
    }
    byAthlete.set(signup.athleteId, {
      athleteId: signup.athleteId,
      name: signup.name,
      email: signup.email,
      tournaments: [signup.tournamentName],
    });
  }

  return [...byAthlete.values()].sort((a, b) => a.name.localeCompare(b.name));
}
