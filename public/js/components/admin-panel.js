import { $, toggle, setMessage } from '../lib/dom.js';
import { login, logout, fetchSignups } from '../lib/api.js';
import { state, setState } from '../state/store.js';
import { renderSignups } from './signup-list.js';
import { renderAthletes } from './athlete-list.js';

const TABS = [
  ['#tab-signups', 'signups'],
  ['#tab-athletes', 'athletes'],
];

/**
 * Login gate, plus two views of the same data: sign-ups (one row per entry,
 * removable) and athletes (one row per person). The toolbar buttons open the
 * dialog straight onto one of them; the tabs switch once it is open.
 *
 * The `isAdmin` flag here only decides what is drawn. The server checks the
 * session cookie on every request, so flipping it in DevTools yields an empty
 * panel and a 401.
 */
export function mountAdminPanel() {
  const dialog = $('#admin-dialog');
  const loginForm = $('#admin-login-form');
  const error = $('#admin-error');
  let view = 'signups';

  /**
   * Swaps the page between its two audiences: an admin gets the toolbar, a
   * visitor gets the sign-up form. The "Admin login" link lives inside that
   * form, which is why hiding it once logged in costs nothing — Log out is
   * in the dialog the toolbar opens.
   */
  function syncToolbar() {
    toggle($('#admin-toolbar'), state.isAdmin);
    toggle($('#signup-panel'), !state.isAdmin);
  }

  function showViews() {
    toggle($('#admin-login-view'), !state.isAdmin);
    toggle($('#admin-panel-view'), state.isAdmin);
    toggle($('#signups-view'), view === 'signups');
    toggle($('#athletes-view'), view === 'athletes');
    for (const [selector, name] of TABS) {
      $(selector).setAttribute('aria-selected', String(view === name));
    }
  }

  async function refresh() {
    try {
      const { signups } = await fetchSignups();
      setState({ signups });
    } catch {
      // The session expired server-side while the page stayed open.
      setState({ isAdmin: false, signups: [] });
      syncToolbar();
      showViews();
      return;
    }
    renderSignups(refresh);
    renderAthletes();
    showViews();
  }

  async function openWith(next) {
    view = next;
    showViews();
    if (!dialog.open) dialog.showModal();
    if (state.isAdmin) await refresh();
  }

  for (const [selector, name] of TABS) {
    $(selector).addEventListener('click', () => openWith(name));
  }
  $('#open-signups').addEventListener('click', () => openWith('signups'));
  $('#open-athletes').addEventListener('click', () => openWith('athletes'));
  $('#open-admin').addEventListener('click', () => openWith(view));

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(error, '');
    try {
      await login(loginForm.elements.password.value);
      loginForm.reset();
      setState({ isAdmin: true });
      syncToolbar();
      // Logging in just unlocks the toolbar. Which list to look at, if any,
      // is the admin's choice — so close, rather than landing them in one.
      dialog.close();
    } catch (failure) {
      setMessage(error, failure.message, 'error');
    }
  });

  $('#admin-logout').addEventListener('click', async () => {
    await logout().catch(() => {});
    setState({ isAdmin: false, signups: [] });
    syncToolbar();
    dialog.close();
  });

  return { syncToolbar };
}
