/**
 * Every call to the server lives here. Requests send and receive JSON and
 * always include cookies, since the admin session rides in an HttpOnly cookie
 * the browser cannot see or set itself.
 */

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    ...options,
  });

  let body = {};
  try {
    body = await response.json();
  } catch {
    // A non-JSON body means something upstream failed; fall through to the
    // status check, which produces a better message than a parse error would.
  }

  if (!response.ok) {
    throw new Error(body.error || 'Something went wrong. Please try again.');
  }
  return body;
}

const post = (url, data) => request(url, { method: 'POST', body: JSON.stringify(data) });

export const login = (email, password) => post('/api/admin/login', { email, password });

export const changePassword = (password) => post('/api/admin/password', { password });

export const fetchAdmins = () => request('/api/admins');

export const addAdmin = (admin) => post('/api/admins', admin);

export const removeAdmin = (id) =>
  request(`/api/admins?id=${encodeURIComponent(id)}`, { method: 'DELETE' });

export const logout = () => post('/api/admin/logout', {});

export const checkSession = () => request('/api/admin/session');

export const submitSignup = (signup) => post('/api/signups', signup);

export const fetchSignups = () => request('/api/signups');

export const removeSignup = (id) =>
  request(`/api/signups?id=${encodeURIComponent(id)}`, { method: 'DELETE' });

export const fetchTournaments = () => request('/api/tournaments');

export const saveTournament = (tournament) => post('/api/tournaments', tournament);

export const removeTournament = (id) =>
  request(`/api/tournaments?id=${encodeURIComponent(id)}`, { method: 'DELETE' });

/**
 * Fire-and-forget notification to Netlify Forms, which emails the coaches.
 * The database write is the source of truth; this failing must never turn a
 * successful sign-up into an error, so it swallows everything.
 */
export function notifyByEmail({ name, email, tournament }) {
  const body = new URLSearchParams({
    'form-name': 'tournament-signup',
    name,
    email: email || '',
    tournament,
  });

  fetch('/', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  }).catch(() => {});
}
