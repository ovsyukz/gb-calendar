import { TOURNAMENTS } from './data/tournaments.js';
import { validateTournaments } from './data/validate.js';
import { checkSession, fetchTournaments } from './lib/api.js';
import { setState } from './state/store.js';
import { mountCalendar } from './components/calendar-grid.js';
import { mountSubtitle } from './components/subtitle.js';
import { mountUpcoming } from './components/upcoming-list.js';
import { mountSignupForm } from './components/signup-form.js';
import { mountAdminPanel } from './components/admin-panel.js';
import { mountTournamentModal } from './components/tournament-modal.js';

/**
 * Entry point. Draws immediately from the seed list so the calendar is never
 * blank, then asks the server for the merged list (seed plus admin edits) and
 * whether this browser still holds an admin session.
 */

setState({ tournaments: validateTournaments(TOURNAMENTS) });

const tournamentModal = mountTournamentModal();
const adminPanel = mountAdminPanel();

mountSubtitle();
mountCalendar({ onAddOn: tournamentModal.openAdd, onEdit: tournamentModal.openEdit });
mountUpcoming();
mountSignupForm();

fetchTournaments()
  .then(({ tournaments }) => setState({ tournaments }))
  .catch(() => {}); // Keep the seed list; the calendar still works offline.

// Restores the admin's tools across a page refresh. The session cookie is
// HttpOnly, so only the server can answer this. Failure means "not logged in",
// which is already the default.
checkSession()
  .then(({ isAdmin }) => {
    setState({ isAdmin });
    adminPanel.syncToolbar();
  })
  .catch(() => {});
