import { $, toggle, setMessage } from '../lib/dom.js';
import { changePassword } from '../lib/api.js';
import { checkNewPassword } from '../lib/password-rules.js';

/**
 * The Change password dialog, for an admin who is already signed in and
 * settled. The forced first-login version is password-gate.js; this one is
 * dismissable and asks for the current password first.
 *
 * On success the form is taken away and the confirmation left in its place.
 * The dialog itself stays open: closing silently is indistinguishable from
 * the click not having worked, and this is the one action where nobody wants
 * to wonder. Nothing auto-dismisses — the admin closes it when they have read
 * it.
 */
export function mountChangePassword() {
  const dialog = $('#change-password-dialog');
  const form = $('#change-password-form');
  const intro = $('#change-password-intro');
  const message = $('#change-password-message');

  /** The form and its preamble travel together — both, or neither. */
  function showForm(visible) {
    toggle(form, visible);
    toggle(intro, visible);
  }

  $('#open-change-password').addEventListener('click', () => {
    // Reopening after a successful change has to put the form back, or the
    // dialog would show nothing but the last confirmation forever.
    form.reset();
    showForm(true);
    setMessage(message, '');
    dialog.showModal();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const problem = checkNewPassword(
      form.elements.password.value,
      form.elements.confirm.value
    );
    if (problem) return setMessage(message, problem, 'error');

    try {
      await changePassword({
        currentPassword: form.elements.currentPassword.value,
        password: form.elements.password.value,
      });
      // Reset as well as hide: `hidden` leaves the values in the DOM, and the
      // new password should not be sitting in a box waiting to be revealed.
      // A failure deliberately leaves the fields filled — that is a typo to
      // correct, not a secret to tidy away.
      form.reset();
      showForm(false);
      setMessage(message, 'Password changed.', 'success');
    } catch (failure) {
      setMessage(message, failure.message, 'error');
    }
  });
}
