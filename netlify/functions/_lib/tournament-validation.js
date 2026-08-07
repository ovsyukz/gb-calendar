/**
 * Server-side validation of a tournament submitted by an admin. Mirrors the
 * rules documented in tournaments.js, so a browser-side mistake and a direct
 * POST are rejected the same way.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9-]{1,40}$/;

function cleanLinks(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l) => l?.label && l?.url)
    .map((l) => ({
      label: String(l.label).slice(0, 40),
      url: String(l.url).slice(0, 500),
    }));
}

export function validateTournament(body) {
  const id = String(body?.id ?? '')
    .trim()
    .toLowerCase();
  const name = String(body?.name ?? '').trim();
  const location = String(body?.location ?? '').trim();
  const date = String(body?.date ?? '').trim();
  const endDate = String(body?.endDate ?? '').trim();
  const notes = String(body?.notes ?? '').trim();

  if (!ID.test(id))
    return { error: 'Id must be lowercase letters, numbers, and dashes.' };
  if (!name) return { error: 'Please enter a tournament name.' };
  if (name.length > 120) return { error: 'That name is too long.' };
  if (!DATE.test(date)) return { error: 'Date must look like 2026-08-09.' };
  if (notes.length > 500)
    return { error: 'That note is too long — keep it under 500 characters.' };

  if (endDate) {
    if (!DATE.test(endDate)) return { error: 'End date must look like 2026-08-09.' };
    if (endDate < date) return { error: 'The end date is before the start date.' };
  }

  for (const link of cleanLinks(body?.links)) {
    if (!/^https?:\/\//.test(link.url)) return { error: 'Links must start with http.' };
  }

  return {
    value: {
      id,
      name,
      location: location || null,
      date,
      endDate: endDate || null,
      notes: notes || null,
      links: cleanLinks(body?.links),
    },
  };
}
