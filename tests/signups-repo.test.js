import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { repo, applySchema, resetTables, countAthletes } from './helpers/db.js';

const { findOrCreateAthlete, createSignup, listSignups, deleteSignup } = repo;

const athlete = (email = 'sarah@example.com') =>
  findOrCreateAthlete({ name: 'Sarah', email });

beforeAll(applySchema);
beforeEach(resetTables);

describe('createSignup', () => {
  it('reports true the first time and false on a repeat', async () => {
    const id = await athlete();

    expect(await createSignup({ athleteId: id, tournamentId: 'ibjjf' })).toBe(true);
    expect(await createSignup({ athleteId: id, tournamentId: 'ibjjf' })).toBe(false);
  });

  it('lets two athletes sharing an email both enter the same tournament', async () => {
    // The bug this guards: both sign-ups collapsed onto one athlete id, so the
    // second hit UNIQUE (athlete_id, tournament_id) and was silently dropped.
    const abe = await findOrCreateAthlete({
      name: 'Abe Gih',
      email: 'parent@example.com',
    });
    const jib = await findOrCreateAthlete({
      name: 'Jib Gih',
      email: 'parent@example.com',
    });

    expect(await createSignup({ athleteId: abe, tournamentId: 'tap-cancer' })).toBe(true);
    expect(await createSignup({ athleteId: jib, tournamentId: 'tap-cancer' })).toBe(true);
    expect(await listSignups()).toHaveLength(2);
  });

  it('allows one athlete in several tournaments', async () => {
    const id = await athlete();
    await createSignup({ athleteId: id, tournamentId: 'ibjjf' });
    await createSignup({ athleteId: id, tournamentId: 'gi-jul' });

    expect(await listSignups()).toHaveLength(2);
  });
});

describe('listSignups', () => {
  it('joins the athlete and returns newest first', async () => {
    const one = await findOrCreateAthlete({ name: 'First', email: 'a@example.com' });
    await createSignup({ athleteId: one, tournamentId: 'ibjjf' });
    const two = await findOrCreateAthlete({ name: 'Second', email: 'b@example.com' });
    await createSignup({ athleteId: two, tournamentId: 'gi-jul' });

    const rows = await listSignups();
    expect(rows.map((r) => r.name)).toEqual(['Second', 'First']);
    expect(rows[0].email).toBe('b@example.com');
  });

  it('orders stably when two sign-ups share a timestamp', async () => {
    const id = await athlete();
    await createSignup({ athleteId: id, tournamentId: 'ibjjf' });
    await createSignup({ athleteId: id, tournamentId: 'gi-jul' });

    // now() is the transaction timestamp, so these can tie; id breaks it.
    const rows = await listSignups();
    expect(rows.map((r) => r.tournament_id)).toEqual(['gi-jul', 'ibjjf']);
  });
});

describe('deleteSignup', () => {
  it('removes the row and reports whether anything went', async () => {
    const id = await athlete();
    await createSignup({ athleteId: id, tournamentId: 'ibjjf' });
    const [row] = await listSignups();

    expect(await deleteSignup(row.id)).toBe(true);
    expect(await deleteSignup(row.id)).toBe(false);
    expect(await listSignups()).toHaveLength(0);
  });

  it('leaves the athlete behind so their other sign-ups survive', async () => {
    const id = await athlete();
    await createSignup({ athleteId: id, tournamentId: 'ibjjf' });
    await createSignup({ athleteId: id, tournamentId: 'gi-jul' });

    await deleteSignup((await listSignups())[0].id);
    expect(await listSignups()).toHaveLength(1);
    expect(await countAthletes()).toBe(1);
  });
});
