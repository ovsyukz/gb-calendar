/**
 * Checks TOURNAMENTS at load time so a typo produces a readable console
 * message instead of a blank calendar. Never throws — one bad entry is
 * dropped and the rest of the calendar still renders.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function problemsWith(entry, index, seenIds) {
  const where = entry?.name || entry?.id || `entry #${index + 1}`;
  const problems = [];

  if (!entry?.id) problems.push('missing "id"');
  else if (seenIds.has(entry.id)) problems.push(`duplicate id "${entry.id}"`);

  if (!entry?.name) problems.push('missing "name"');

  if (!entry?.date) problems.push('missing "date"');
  else if (!DATE_PATTERN.test(entry.date)) {
    problems.push(`"date" must look like 2026-08-09, got "${entry.date}"`);
  }

  if (entry?.endDate) {
    if (!DATE_PATTERN.test(entry.endDate)) {
      problems.push(`"endDate" must look like 2026-08-09, got "${entry.endDate}"`);
    } else if (entry.endDate < entry.date) {
      problems.push('"endDate" is before "date"');
    }
  }

  for (const link of entry?.links ?? []) {
    if (!link?.label || !link?.url) problems.push('a link is missing "label" or "url"');
  }

  return problems.length ? { where, problems } : null;
}

/** Returns only the entries that are safe to render. */
export function validateTournaments(tournaments) {
  const seenIds = new Set();
  const valid = [];

  tournaments.forEach((entry, index) => {
    const failure = problemsWith(entry, index, seenIds);
    if (failure) {
      console.error(
        `Tournament "${failure.where}" was skipped: ${failure.problems.join('; ')}`
      );
      return;
    }
    seenIds.add(entry.id);
    valid.push(entry);
  });

  return valid;
}
