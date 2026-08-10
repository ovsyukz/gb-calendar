import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { sql, repo, applySchema, resetTables, countAthletes } from './helpers/db.js';

const { findOrCreateAthlete } = repo;

beforeAll(applySchema);
beforeEach(resetTables);

describe('findOrCreateAthlete', () => {
  it('reuses the athlete when the same email signs up again', async () => {
    const first = await findOrCreateAthlete({
      name: 'Sarah A',
      email: 'sarah@example.com',
    });
    const again = await findOrCreateAthlete({
      name: 'Sarah A',
      email: 'sarah@example.com',
    });

    expect(again).toBe(first);
    expect(await countAthletes()).toBe(1);
  });

  it('matches emails case-insensitively', async () => {
    const lower = await findOrCreateAthlete({
      name: 'Sarah',
      email: 'sarah@example.com',
    });
    const upper = await findOrCreateAthlete({
      name: 'Sarah',
      email: 'Sarah@Example.COM',
    });

    expect(upper).toBe(lower);
    expect(await countAthletes()).toBe(1);
  });

  it('matches names case-insensitively, so capitalisation is not a new person', async () => {
    const first = await findOrCreateAthlete({
      name: 'Sarah A',
      email: 'sarah@example.com',
    });
    const again = await findOrCreateAthlete({
      name: 'sarah a',
      email: 'sarah@example.com',
    });

    expect(again).toBe(first);
    expect(await countAthletes()).toBe(1);
  });

  it('keeps two people apart when they share one email address', async () => {
    // A parent signing up two children uses one address for both. Matching on
    // email alone merged them: the second child overwrote the first one's
    // name, and their sign-up was then dropped as a duplicate.
    const abe = await findOrCreateAthlete({
      name: 'Abe Gih',
      email: 'parent@example.com',
    });
    const jib = await findOrCreateAthlete({
      name: 'Jib Gih',
      email: 'parent@example.com',
    });

    expect(jib).not.toBe(abe);
    expect(await countAthletes()).toBe(2);

    const rows = await sql()`SELECT name FROM athletes ORDER BY id`;
    expect(rows.map((r) => r.name)).toEqual(['Abe Gih', 'Jib Gih']);
  });

  it('treats a corrected name as a new athlete, which is the cost of the above', async () => {
    // Nothing can tell a typo apart from a sibling, so a mistyped name leaves
    // a stray record to delete rather than silently absorbing someone else.
    await findOrCreateAthlete({ name: 'Sara', email: 'sarah@example.com' });
    await findOrCreateAthlete({ name: 'Sarah Aslanifar', email: 'sarah@example.com' });

    expect(await countAthletes()).toBe(2);
  });

  it('creates a separate record each time when no email is given', async () => {
    const a = await findOrCreateAthlete({ name: 'Sarah', email: null });
    const b = await findOrCreateAthlete({ name: 'Sarah', email: null });

    // Two different people can share a name; without an email there is
    // nothing to tell them apart, so they must not be merged.
    expect(b).not.toBe(a);
    expect(await countAthletes()).toBe(2);
  });
});
