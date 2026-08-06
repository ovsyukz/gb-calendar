import { $, setMessage } from '../lib/dom.js';
import { submitSignup, notifyByEmail } from '../lib/api.js';
import { parseDate, MONTH_ABBR } from '../lib/dates.js';

/** Name (required), email (optional), tournament (required). */
export function mountSignupForm(tournaments) {
  const form = $('#signup-form');
  const message = $('#signup-message');
  const submit = form.querySelector('button[type="submit"]');

  fillTournamentOptions($('#signup-tournament'), tournaments);

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

      setMessage(
        message,
        result.alreadySignedUp
          ? `You were already signed up for ${result.tournament}.`
          : "You're signed up! See you on the mats.",
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

function fillTournamentOptions(select, tournaments) {
  const placeholder = new Option('Select a tournament…', '');
  const options = [...tournaments]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((tournament) => new Option(optionLabel(tournament), tournament.id));

  select.replaceChildren(placeholder, ...options);
}

function optionLabel({ name, location, date }) {
  const [, month, day] = parseDate(date);
  const where = location ? ` — ${location}` : '';
  return `${name}${where} (${MONTH_ABBR[month - 1]} ${day})`;
}
