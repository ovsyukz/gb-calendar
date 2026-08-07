/**
 * Rules for admin accounts and passwords, enforced on the server because the
 * browser's copy is a convenience anyone can bypass.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 12;

export function validateNewAdmin(body) {
  const name = String(body?.name ?? '').trim();
  const email = String(body?.email ?? '')
    .trim()
    .toLowerCase();
  const password = String(body?.password ?? '');

  if (!name) return { error: 'Please enter a name.' };
  if (name.length > 100) return { error: 'That name is too long.' };
  if (!EMAIL.test(email)) return { error: 'That email address does not look right.' };
  if (email.length > 254) return { error: 'That email address is too long.' };

  const passwordProblem = validatePassword(password);
  if (passwordProblem) return { error: passwordProblem };

  return { value: { name, email, password } };
}

/** Returns a message, or null when the password is acceptable. */
export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 200) return 'That password is too long.';
  return null;
}
