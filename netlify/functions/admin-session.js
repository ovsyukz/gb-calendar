import { isAdmin, json } from './_lib/auth.js';

export const config = { path: '/api/admin/session' };

/**
 * Lets the page ask "am I still logged in?" on load, so an admin who refreshes
 * keeps their panel instead of being silently signed out. The cookie is
 * HttpOnly, so the browser cannot answer this question on its own.
 */
export default async function adminSession(request) {
  return json({ isAdmin: isAdmin(request) });
}
