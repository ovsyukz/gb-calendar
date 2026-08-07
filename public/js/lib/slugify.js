/**
 * Turns a tournament name into an id: lowercase, dashes, no punctuation.
 * "IBJJF Chicago Open!" → "ibjjf-chicago-open"
 *
 * Ids are permanent once sign-ups exist, so this only ever runs for a
 * tournament being created. A suffix keeps two same-named events apart —
 * "Grappling Industries" happens more than once a year.
 */
export function slugify(name, existingIds = []) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || 'tournament';

  if (!existingIds.includes(base)) return base;

  let suffix = 2;
  while (existingIds.includes(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
