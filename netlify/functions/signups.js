import { isAdmin, json, unauthorized } from './_lib/auth.js';
import { validateSignup } from './_lib/validation.js';
import { tournamentIds, tournamentName, tournamentNames } from './_lib/tournament-ids.js';
import {
  findOrCreateAthlete,
  createSignup,
  listSignups,
  deleteSignup,
} from './_lib/signups-repo.js';

export const config = { path: '/api/signups' };

export default async function signups(request) {
  switch (request.method) {
    case 'POST':
      return create(request);
    case 'GET':
      return list(request);
    case 'DELETE':
      return remove(request);
    default:
      return json({ error: 'Method not allowed' }, 405);
  }
}

/** Public. Anyone competing can sign themselves up. */
async function create(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected a JSON body' }, 400);
  }

  const { error, value } = validateSignup(body, await tournamentIds());
  if (error) return json({ error }, 400);

  const athleteId = await findOrCreateAthlete(value);
  const isNew = await createSignup({ athleteId, tournamentId: value.tournamentId });

  // An existing sign-up is success, not failure — the athlete is on the list
  // either way, and telling them "already signed up" is friendlier than an error.
  return json({
    ok: true,
    alreadySignedUp: !isNew,
    tournament: await tournamentName(value.tournamentId),
  });
}

/** Admin only — this returns names and email addresses. */
async function list(request) {
  if (!isAdmin(request)) return unauthorized();

  const rows = await listSignups();
  // Resolved once for the whole list, not once per row.
  const names = await tournamentNames();

  return json({
    signups: rows.map((row) => ({
      id: String(row.id),
      // Grouping key for the athletes view: two competitors can share a name,
      // and an athlete may have no email, so neither is safe to group on.
      athleteId: String(row.athlete_id),
      name: row.name,
      email: row.email,
      tournamentId: row.tournament_id,
      tournamentName: names.get(row.tournament_id) ?? row.tournament_id,
      createdAt: row.created_at,
    })),
  });
}

/** Admin only. */
async function remove(request) {
  if (!isAdmin(request)) return unauthorized();

  const id = new URL(request.url).searchParams.get('id');
  if (!id || !/^\d+$/.test(id)) return json({ error: 'A numeric id is required' }, 400);

  const deleted = await deleteSignup(Number(id));
  return deleted ? json({ ok: true }) : json({ error: 'No such sign-up' }, 404);
}
