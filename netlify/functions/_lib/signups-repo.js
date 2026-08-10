import { sql } from './db.js';

/**
 * Every SQL statement in the app lives here. Functions call these; nothing
 * else writes queries.
 */

/**
 * An athlete is the same person only when the name and the email both match —
 * matching on email alone merged a parent's two children into one competitor.
 * The same name and address signing up again is reused across tournaments,
 * which is the point of collecting the address.
 *
 * Without an email there is nothing reliable to match on (two competitors are
 * often both "Sarah"), so a fresh record is created and the sign-up simply
 * stands alone.
 */
export async function findOrCreateAthlete({ name, email }) {
  if (!email) {
    const [row] = await sql()`
      INSERT INTO athletes (name) VALUES (${name}) RETURNING id
    `;
    return row.id;
  }

  // Conflict target is the functional index from 007_athlete_identity.sql, so
  // "Abe Gih" and "abe gih" at one address are one person, while "Abe" and
  // "Jib" at that address are two.
  //
  // DO UPDATE rather than DO NOTHING: on a conflict DO NOTHING returns no row,
  // leaving RETURNING with nothing to hand back. Re-storing the name changes
  // nothing but the capitalisation, which follows the most recent spelling.
  const [row] = await sql()`
    INSERT INTO athletes (name, email) VALUES (${name}, ${email})
    ON CONFLICT (lower(name), lower(email)) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;
  return row.id;
}

/** Returns false when this athlete was already signed up for this tournament. */
export async function createSignup({ athleteId, tournamentId }) {
  const rows = await sql()`
    INSERT INTO signups (athlete_id, tournament_id)
    VALUES (${athleteId}, ${tournamentId})
    ON CONFLICT (athlete_id, tournament_id) DO NOTHING
    RETURNING id
  `;
  return rows.length > 0;
}

export async function listSignups() {
  return sql()`
    SELECT s.id, s.tournament_id, s.created_at, a.id AS athlete_id, a.name, a.email
    FROM signups s
    JOIN athletes a ON a.id = s.athlete_id
    -- created_at comes from now(), which is the transaction timestamp, so two
    -- sign-ups in the same instant tie. id breaks it, keeping the order stable.
    ORDER BY s.created_at DESC, s.id DESC
  `;
}

export async function deleteSignup(id) {
  const rows = await sql()`DELETE FROM signups WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}
