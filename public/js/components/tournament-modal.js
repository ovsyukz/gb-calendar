import { $, setMessage, toggle } from '../lib/dom.js';
import { saveTournament, removeTournament } from '../lib/api.js';
import { state, setState } from '../state/store.js';
import { slugify } from '../lib/slugify.js';

/**
 * Add / edit / delete a tournament. Admin only — the button and the click
 * targets are not rendered otherwise, and the server rejects the write
 * regardless, so hiding the UI is presentation rather than protection.
 *
 * Returns { openAdd, openEdit } for the calendar to call.
 */
export function mountTournamentModal() {
  const dialog = $('#tournament-dialog');
  const form = $('#tournament-form');
  const message = $('#tournament-message');
  let editingId = null;

  function open({
    id = null,
    name = '',
    location = '',
    date = '',
    endDate = '',
    links = [],
  }) {
    editingId = id;
    $('#tournament-modal-title').textContent = id ? 'Edit Tournament' : 'Add Tournament';
    form.elements.name.value = name;
    form.elements.location.value = location;
    form.elements.date.value = date;
    form.elements.endDate.value = endDate;
    form.elements.link.value = links[0]?.url ?? '';
    setMessage(message, '');
    toggle($('#tournament-delete'), Boolean(id));
    dialog.showModal();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = form.elements.name.value.trim();
    const date = form.elements.date.value;
    if (!name) return setMessage(message, 'Please enter a tournament name.', 'error');
    if (!date) return setMessage(message, 'Please choose a date.', 'error');

    const url = form.elements.link.value.trim();
    try {
      const { tournaments } = await saveTournament({
        // A new tournament gets an id derived from its name; an existing one
        // keeps its id, because sign-ups are stored against it.
        id:
          editingId ??
          slugify(
            name,
            state.tournaments.map((t) => t.id)
          ),
        name,
        location: form.elements.location.value.trim(),
        date,
        endDate: form.elements.endDate.value,
        links: url ? [{ label: 'Register', url }] : [],
      });
      setState({ tournaments });
      dialog.close();
    } catch (failure) {
      setMessage(message, failure.message, 'error');
    }
  });

  $('#tournament-delete').addEventListener('click', async () => {
    if (!editingId) return;
    try {
      const { tournaments } = await removeTournament(editingId);
      setState({ tournaments });
      dialog.close();
    } catch (failure) {
      setMessage(message, failure.message, 'error');
    }
  });

  $('#add-tournament').addEventListener('click', () => open({}));

  // Shown only to an admin, and kept in step if the session ends.
  const syncButton = () => toggle($('#add-tournament'), state.isAdmin);
  syncButton();

  return {
    syncButton,
    openAdd: (date) => open({ date }),
    openEdit: (tournament) => open({ ...tournament, endDate: tournament.endDate ?? '' }),
  };
}
