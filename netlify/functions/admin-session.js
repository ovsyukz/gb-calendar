import { requireAdmin, session, json } from './_lib/auth.js';

export const config = { path: '/api/admin/session' };

/**
 * Lets the page ask "am I still logged in?" on load, so an admin who refreshes
 * keeps their tools instead of being silently signed out. The cookie is
 * HttpOnly, so the browser cannot answer this question on its own.
 *
 * Uses requireAdmin, so an admin who has been removed is reported as signed
 * out on their next page load rather than being shown tools that no longer
 * work.
 *
 * `mustChangePassword` survives a refresh too — otherwise reloading would be
 * a way to skip the forced change.
 */
export default async function adminSession(request) {
  const claims = session(request);

  return json({
    isAdmin: Boolean(await requireAdmin(request)),
    mustChangePassword: Boolean(claims?.pending),
  });
}
