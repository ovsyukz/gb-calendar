import { isAdmin, session, json } from './_lib/auth.js';

export const config = { path: '/api/admin/session' };

/**
 * Lets the page ask "am I still logged in?" on load, so an admin who refreshes
 * keeps their tools instead of being silently signed out. The cookie is
 * HttpOnly, so the browser cannot answer this question on its own.
 *
 * `mustChangePassword` survives a refresh too — otherwise reloading would be
 * a way to skip the forced change.
 */
export default async function adminSession(request) {
  const claims = session(request);

  return json({
    isAdmin: isAdmin(request),
    mustChangePassword: Boolean(claims?.pending),
  });
}
