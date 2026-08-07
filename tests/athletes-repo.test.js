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

  it('updates the stored name when someone corrects it', async () => {
    await findOrCreateAthlete({ name: 'Sara', email: 'sarah@example.com' });
    await findOrCreateAthlete({ name: 'Sarah Aslanifar', email: 'sarah@example.com' });

    const [row] = await sql()`SELECT name FROM athletes`;
    expect(row.name).toBe('Sarah Aslanifar');
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
