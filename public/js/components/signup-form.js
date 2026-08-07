import { $, setMessage } from '../lib/dom.js';
import { submitSignup, notifyByEmail } from '../lib/api.js';
import { state, subscribe } from '../state/store.js';
import { fillTournamentOptions } from '../lib/tournament-options.js';

/** Name (required), email (optional), tournament (required). */
export function mountSignupForm() {
  const form = $('#signup-form');
  const message = $('#signup-message');
  const submit = form.querySelector('button[type="submit"]');
  const select = $('#signup-tournament');

  // Keeps the dropdown in step when an admin adds or removes a tournament.
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

    const problem = firstProblem(signup);
    if (problem) return setMessage(message, problem, 'error');

    submit.disabled = true;
    setMessage(message, '');

    try {
      const result = await submitSignup(signup);
      notifyByEmail({ ...signup, tournament: result.tournament });

      // Name the tournament back: the moment of doubt is "did I pick the
      // right one from that dropdown?", not "did the button work".
      setMessage(
        message,
        result.alreadySignedUp
          ? `You're already on the list for ${result.tournament}. You've got this.`
          : `You're signed up for ${result.tournament}. Train hard — you've got this. 🥋`,
        'success'
      );
      form.reset();
    } catch (error) {
      setMessage(message, error.message, 'error');
    } finally {
      submit.disabled = false;
    }
  });
}

/** Mirrors the server's rules so mistakes surface without a round trip. */
function firstProblem({ name, email, tournamentId }) {
  if (!name) return 'Please enter your name.';
  if (!tournamentId) return 'Please choose a tournament.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'That email address does not look right.';
  }
  return null;
}
