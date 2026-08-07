import { describe, it, expect } from 'vitest';
import { validateTournament } from '../netlify/functions/_lib/tournament-validation.js';
import { slugify } from '../public/js/lib/slugify.js';

const valid = { id: 'ibjjf', name: 'IBJJF Chicago Open', date: '2026-08-08' };

describe('validateTournament', () => {
  it('accepts a minimal tournament', () => {
    expect(validateTournament(valid).value).toMatchObject({
      id: 'ibjjf',
      date: '2026-08-08',
    });
  });

  it('turns blank optional fields into null', () => {
    const { value } = validateTournament(valid);
    expect(value.location).toBeNull();
    expect(value.endDate).toBeNull();
  });

  it('rejects an id with spaces or capitals left over', () => {
    expect(validateTournament({ ...valid, id: 'Not An Id' }).error).toBeTruthy();
  });

  it('requires a name and a well-formed date', () => {
    expect(validateTournament({ ...valid, name: '  ' }).error).toMatch(/name/i);
    expect(validateTournament({ ...valid, date: '08/08/2026' }).error).toMatch(/date/i);
  });

  it('rejects an end date before the start', () => {
    expect(validateTournament({ ...valid, endDate: '2026-08-01' }).error).toBeTruthy();
  });

  it('rejects a link that is not http', () => {
    const links = [{ label: 'Register', url: 'javascript:alert(1)' }];
    expect(validateTournament({ ...valid, links }).error).toBeTruthy();
  });

  it('drops malformed links instead of failing', () => {
    const links = [{ label: 'Register' }, { url: 'https://example.com' }];
    expect(validateTournament({ ...valid, links }).value.links).toEqual([]);
  });
});

describe('slugify', () => {
  it('makes an id from a name', () => {
    expect(slugify('IBJJF Chicago Open!')).toBe('ibjjf-chicago-open');
  });

  it('produces an id the server will accept', () => {
    const id = slugify('2026 Chicago Fall Games');
    expect(validateTournament({ ...valid, id }).error).toBeUndefined();
  });

  it('suffixes when the id is taken, so repeat events stay distinct', () => {
    expect(slugify('Grappling Industries', ['grappling-industries'])).toBe(
      'grappling-industries-2'
    );
    expect(
      slugify('Grappling Industries', ['grappling-industries', 'grappling-industries-2'])
    ).toBe('grappling-industries-3');
  });

  it('falls back rather than returning an empty id', () => {
    expect(slugify('!!!')).toBe('tournament');
  });
});
