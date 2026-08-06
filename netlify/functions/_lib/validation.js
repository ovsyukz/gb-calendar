/**
 * Server-side validation of sign-up input. The browser checks the same rules
 * for a fast message, but that is a convenience — this is the control. Anyone
 * can POST to the endpoint directly.
 */

// Deliberately loose: the only reliable test of an address is sending mail to
// it. This catches typos and obvious junk without rejecting valid oddities.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_NAME = 100;
const MAX_EMAIL = 254; // RFC 5321

export function validateSignup(body, validTournamentIds) {
  const name = String(body?.name ?? '').trim();
  const email = String(body?.email ?? '').trim();
  const tournamentId = String(body?.tournamentId ?? '').trim();

  if (!name) return { error: 'Please enter your name.' };
  if (name.length > MAX_NAME) return { error: 'That name is too long.' };

  if (email && !EMAIL_PATTERN.test(email)) {
    return { error: 'That email address does not look right.' };
  }
  if (email.length > MAX_EMAIL) return { error: 'That email address is too long.' };

  if (!tournamentId) return { error: 'Please choose a tournament.' };
  if (!validTournamentIds.includes(tournamentId)) {
    return { error: 'That tournament is not on the calendar.' };
  }

  // Empty string becomes null so it hits the nullable email column cleanly
  // rather than creating an athlete whose email is ''.
  return { value: { name, email: email || null, tournamentId } };
}
