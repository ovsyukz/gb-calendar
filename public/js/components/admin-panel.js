import { $, toggle, setMessage } from '../lib/dom.js';
import { login, logout, fetchSignups } from '../lib/api.js';
import { state, setState } from '../state/store.js';
import { renderSignups } from './signup-list.js';
import { renderAthletes } from './athlete-list.js';

/**
 * Admin login, and the two lists it unlocks — sign-ups and athletes, each in
 * its own dialog.
 *
 * The `isAdmin` flag here only decides what is drawn. The server checks the
 * session cookie on every request, so flipping it in DevTools yields empty
 * dialogs and a 401.
 */
export function mountAdminPanel() {
  const loginDialog = $('#admin-dialog');
  const signupsDialog = $('#signups-dialog');
  const athletesDialog = $('#athletes-dialog');
  const loginForm = $('#admin-login-form');
  const error = $('#admin-error');

  /**
   * Swaps the page between its two audiences: an admin gets the toolbar, a
   * visitor gets the sign-up form. The "Admin login" link lives inside that
   * form, which is why hiding it once logged in costs nothing.
   */
  function syncToolbar() {
    toggle($('#admin-toolbar'), state.isAdmin);
    toggle($('#signup-panel'), !state.isAdmin);
  }

  /** Both dialogs read the same data, so one fetch refreshes either. */
  async function load() {
    try {
      const { signups } = await fetchSignups();
      setState({ signups });
    } catch {
      // The session expired server-side while the page stayed open.
      setState({ isAdmin: false, signups: [] });
      syncToolbar();
      signupsDialog.close();
      athletesDialog.close();
      return false;
    }
    renderSignups(load);
    renderAthletes();
    return true;
  }

  async function open(dialog) {
    if (!dialog.open) dialog.showModal();
    if (!(await load())) dialog.close();
  }

  $('#open-signups').addEventListener('click', () => open(signupsDialog));
  $('#open-athletes').addEventListener('click', () => open(athletesDialog));
  $('#open-admin').addEventListener('click', () => loginDialog.showModal());

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(error, '');
    try {
      await login(
        loginForm.elements.username.value.trim(),
        loginForm.elements.password.value
      );
      loginForm.reset();
      setState({ isAdmin: true });
      syncToolbar();
      // Logging in just unlocks the toolbar. Which list to look at, if any,
      // is the admin's choice — so close, rather than landing them in one.
      loginDialog.close();
    } catch (failure) {
      setMessage(error, failure.message, 'error');
    }
  });

  $('#admin-logout').addEventListener('click', async () => {
    await logout().catch(() => {});
    setState({ isAdmin: false, signups: [] });
    syncToolbar();
  });

  return { syncToolbar };
}
