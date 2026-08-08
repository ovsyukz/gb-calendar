import { TOURNAMENTS } from './data/tournaments.js';
import { validateTournaments } from './data/validate.js';
import { checkSession, fetchTournaments } from './lib/api.js';
import { setState } from './state/store.js';
import { mountCalendar } from './components/calendar-grid.js';
import { mountSubtitle } from './components/subtitle.js';
import { mountUpcoming } from './components/upcoming-list.js';
import { mountSignupForm } from './components/signup-form.js';
import { mountAdminPanel } from './components/admin-panel.js';
import { mountAdminsPanel } from './components/admins-panel.js';
import { mountTournamentModal } from './components/tournament-modal.js';
import { mountPasswordGate } from './components/password-gate.js';
import { mountPasswordReveal } from './components/password-reveal.js';

/**
 * Entry point. Draws immediately from the seed list so the calendar is never
 * blank, then asks the server for the merged list (seed plus admin edits) and
 * what kind of session this browser holds.
 */

setState({ tournaments: validateTournaments(TOURNAMENTS) });

const tournamentModal = mountTournamentModal();
const passwordGate = mountPasswordGate(() => adminPanel.syncToolbar());
const adminPanel = mountAdminPanel(() => passwordGate.require());

mountSubtitle();
mountCalendar({ onAddOn: tournamentModal.openAdd, onEdit: tournamentModal.openEdit });
mountUpcoming({ onEdit: tournamentModal.openEdit });
mountSignupForm();
mountAdminsPanel();
mountPasswordReveal();

fetchTournaments()
  .then(({ tournaments }) => setState({ tournaments }))
  .catch(() => {}); // Keep the seed list; the calendar still works offline.

// Restores the admin's tools across a page refresh. The session cookie is
// HttpOnly, so only the server can answer this. A pending password change
// survives the refresh too — reloading is not a way around it.
checkSession()
  .then(({ isAdmin, mustChangePassword }) => {
    setState({ isAdmin: isAdmin || mustChangePassword, mustChangePassword });
    adminPanel.syncToolbar();
    if (mustChangePassword) passwordGate.require();
  })
  .catch(() => {});
