import { $, setMessage } from '../lib/dom.js';
import { submitSignup } from '../lib/api.js';
import { state, subscribe } from '../state/store.js';
import { fillTournamentOptions } from '../lib/tournament-options.js';

/**
 * Lets an admin enter someone who signed up in person — they no longer see
 * the public form. Its own dialog, so reading the list and adding to it are
 * separate acts rather than one crowded panel.
 *
 * Posts to the same endpoint the public form uses, so the rules and the
 * duplicate handling are identical. No email notification is sent: the coach
 * is the one typing, so telling them by email would be talking to themselves.
 */
export function mountAddSignupForm(onAdded) {
  const dialog = $('#add-signup-dialog');
  const form = $('#add-signup-form');
  const message = $('#add-signup-message');
  const select = $('#add-signup-tournament');
  const submit = form.querySelector('button[type="submit"]');

  $('#open-add-signup').addEventListener('click', () => {
    form.reset();
    setMessage(message, '');
    dialog.showModal();
  });

  const refreshOptions = () => fillTournamentOptions(select, state.tournaments);
  subscribe(refreshOptions);
  refreshOptions();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const signup = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      tournamentId: form.elements.tournamentId.value,
    };

    if (!signup.name) return setMessage(message, 'Please enter a name.', 'error');
    if (!signup.tournamentId) {
      return setMessage(message, 'Please choose a tournament.', 'error');
    }

    submit.disabled = true;
    try {
      const result = await submitSignup(signup);
      form.reset();
      setMessage(
        message,
        result.alreadySignedUp
          ? `${signup.name} was already on the list for ${result.tournament}.`
          : `Added ${signup.name} to ${result.tournament}.`,
        'success'
      );
      await onAdded();
    } catch (failure) {
      setMessage(message, failure.message, 'error');
    } finally {
      submit.disabled = false;
    }
  });
}
