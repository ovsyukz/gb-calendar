import { describe, it, expect } from 'vitest';
import { groupAthletes } from '../public/js/lib/group-athletes.js';

const signup = (athleteId, name, tournamentName, email = null) => ({
  athleteId,
  name,
  email,
  tournamentName,
});

describe('groupAthletes', () => {
  it('collapses one person entered in several tournaments', () => {
    const result = groupAthletes([
      signup('1', 'Sarah', 'IBJJF Chicago Open', 'sarah@example.com'),
      signup('1', 'Sarah', 'Tap Cancer Out', 'sarah@example.com'),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].tournaments).toEqual(['IBJJF Chicago Open', 'Tap Cancer Out']);
  });

  it('keeps two different people with the same name apart', () => {
    // Both called Sarah, neither gave an email — only athleteId separates them.
    const result = groupAthletes([
      signup('1', 'Sarah', 'IBJJF Chicago Open'),
      signup('2', 'Sarah', 'Tap Cancer Out'),
    ]);

    expect(result).toHaveLength(2);
  });

  it('sorts by name', () => {
    const result = groupAthletes([
      signup('1', 'Zoe', 'Tap Cancer Out'),
      signup('2', 'Ana', 'IBJJF Chicago Open'),
    ]);

    expect(result.map((a) => a.name)).toEqual(['Ana', 'Zoe']);
  });

  it('carries the email through, and null when there is none', () => {
    const [withEmail, without] = groupAthletes([
      signup('1', 'Ana', 'Tap Cancer Out', 'ana@example.com'),
      signup('2', 'Zoe', 'Tap Cancer Out'),
    ]);

    expect(withEmail.email).toBe('ana@example.com');
    expect(without.email).toBeNull();
  });

  it('returns nothing for no sign-ups', () => {
    expect(groupAthletes([])).toEqual([]);
  });
});
