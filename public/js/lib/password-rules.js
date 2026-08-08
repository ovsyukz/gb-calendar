/**
 * What the browser can check about a new password before sending it.
 *
 * The length rule is a copy of the server's (admin-validation.js) and is only
 * here to save a round trip — the server enforces it again, because anyone can
 * call the API directly.
 *
 * The match rule is different: it is the one check that genuinely belongs
 * here. It catches a typo, and a typo only exists in the browser. Sending both
 * strings for the server to compare would prove nothing, since the same client
 * that mistyped is the one that would be doing the telling.
 */

export const MIN_PASSWORD_LENGTH = 12;

/** Returns a message to show, or null when the pair is good. */
export function checkNewPassword(password, confirm) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirm) {
    return 'The two passwords do not match.';
  }
  return null;
}
