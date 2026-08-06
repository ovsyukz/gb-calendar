import { $, toggle, setMessage } from '../lib/dom.js';
import { login, logout, fetchSignups } from '../lib/api.js';
import { state, setState } from '../state/store.js';
import { renderSignups } from './signup-list.js';
import { renderAthletes } from './athlete-list.js';

/**
 * Login gate, plus two views of the same data: sign-ups (one row per entry,
 * removable) and athletes (one row per person).
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

  const showViews = () => {
    toggle($('#admin-login-view'), !state.isAdmin);
    toggle($('#admin-panel-view'), state.isAdmin);
    toggle($('#signups-view'), view === 'signups');
    toggle($('#athletes-view'), view === 'athletes');
    $('#tab-signups').setAttribute('aria-selected', String(view === 'signups'));
    $('#tab-athletes').setAttribute('aria-selected', String(view === 'athletes'));
  };

  const draw = () => {
    renderSignups(refresh);
    renderAthletes();
    showViews();
  };

  async function refresh() {
    try {
      const { signups } = await fetchSignups();
      setState({ signups });
    } catch {
      // The session expired server-side while the page stayed open.
      setState({ isAdmin: false, signups: [] });
      showViews();
      return;
    }
    draw();
  }

  for (const [id, name] of [
    ['#tab-signups', 'signups'],
    ['#tab-athletes', 'athletes'],
  ]) {
    $(id).addEventListener('click', () => {
      view = name;
      showViews();
    });
  }

  $('#open-admin').addEventListener('click', async () => {
    showViews();
    dialog.showModal();
    if (state.isAdmin) await refresh();
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(error, '');
    try {
      await login(loginForm.elements.password.value);
      loginForm.reset();
      setState({ isAdmin: true });
      await refresh();
    } catch (failure) {
      setMessage(error, failure.message, 'error');
    }
  });

  $('#admin-logout').addEventListener('click', async () => {
    await logout().catch(() => {});
    setState({ isAdmin: false, signups: [] });
    dialog.close();
  });
}
