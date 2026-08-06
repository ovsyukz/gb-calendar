import { TOURNAMENTS } from './data/tournaments.js';
import { validateTournaments } from './data/validate.js';
import { checkSession } from './lib/api.js';
import { setState } from './state/store.js';
import { mountCalendar } from './components/calendar-grid.js';
import { mountUpcoming } from './components/upcoming-list.js';
import { mountSignupForm } from './components/signup-form.js';
import { mountAdminPanel } from './components/admin-panel.js';

/**
 * Entry point. Validates the tournament list, mounts each component once,
 * then asks the server whether this browser still holds an admin session.
 */

const tournaments = validateTournaments(TOURNAMENTS);

mountCalendar(tournaments);
mountUpcoming(tournaments);
mountSignupForm(tournaments);
mountAdminPanel();

// Restores the admin's panel across a page refresh. The session cookie is
// HttpOnly, so only the server can answer this. Failure just means "not
// logged in", which is already the default.
checkSession()
  .then(({ isAdmin }) => setState({ isAdmin }))
  .catch(() => {});
