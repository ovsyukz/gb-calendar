import { $, setMessage } from '../lib/dom.js';
import { changePassword } from '../lib/api.js';
import { setState } from '../state/store.js';

const MIN_LENGTH = 12;

/**
 * The forced password change for an admin signed in with a temporary
 * password. The dialog has no close button, and cancel attempts are blocked,
 * so the only way past it is to set a password.
 *
 * This is presentation. The real enforcement is server-side: a pending
 * session is rejected by every privileged endpoint (see auth.js), so closing
 * the dialog by other means gains nothing.
 */
export function mountPasswordGate(onSettled) {
  const dialog = $('#password-dialog');
  const form = $('#password-form');
  const error = $('#password-error');

  // Escape fires 'cancel' on a <dialog>; refuse it while the change is owed.
  dialog.addEventListener('cancel', (event) => event.preventDefault());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const password = form.elements.password.value;
    const confirm = form.elements.confirm.value;

    if (password.length < MIN_LENGTH) {
      return setMessage(error, `Use at least ${MIN_LENGTH} characters.`, 'error');
    }
    if (password !== confirm) {
      return setMessage(error, 'The two passwords do not match.', 'error');
    }

    try {
      await changePassword(password);
      form.reset();
      setMessage(error, '');
      dialog.close();
      setState({ mustChangePassword: false });
      onSettled();
    } catch (failure) {
      setMessage(error, failure.message, 'error');
    }
  });

  return {
    require() {
      setMessage(error, '');
      if (!dialog.open) dialog.showModal();
    },
  };
}
