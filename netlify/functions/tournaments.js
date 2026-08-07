import { isAdmin, json, unauthorized } from './_lib/auth.js';
import { validateTournament } from './_lib/tournament-validation.js';
import {
  listTournaments,
  saveTournament,
  deleteTournament,
} from './_lib/tournaments-repo.js';

export const config = { path: '/api/tournaments' };

export default async function tournaments(request) {
  switch (request.method) {
    case 'GET':
      return json({ tournaments: await listTournaments() });
    case 'POST':
      return save(request);
    case 'DELETE':
      return remove(request);
    default:
      return json({ error: 'Method not allowed' }, 405);
  }
}

/** Admin only — this is the whole point of the login. */
async function save(request) {
  if (!isAdmin(request)) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected a JSON body' }, 400);
  }

  const { error, value } = validateTournament(body);
  if (error) return json({ error }, 400);

  await saveTournament(value);
  return json({ ok: true, tournaments: await listTournaments() });
}

/** Admin only. */
async function remove(request) {
  if (!isAdmin(request)) return unauthorized();

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: 'An id is required' }, 400);

  await deleteTournament(id);
  return json({ ok: true, tournaments: await listTournaments() });
}
