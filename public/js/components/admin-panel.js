import { $, clone, fill, replaceChildren, toggle, setMessage } from '../lib/dom.js';
import { login, logout, fetchSignups, removeSignup } from '../lib/api.js';
import { state, setState } from '../state/store.js';

/**
 * Login gate plus the participant list. The `isAdmin` flag here only decides
 * what is drawn — the server checks the session cookie on every request, so a
 * user who flips this in DevTools gets an empty panel and a 401.
 */
export function mountAdminPanel() {
  const dialog = $('#admin-dialog');
  const loginView = $('#admin-login-view');
  const panelView = $('#admin-panel-view');
  const loginForm = $('#admin-login-form');
  const error = $('#admin-error');

  const showCorrectView = () => {
    toggle(loginView, !state.isAdmin);
    toggle(panelView, state.isAdmin);
  };

  $('#open-admin').addEventListener('click', async () => {
    showCorrectView();
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
      showCorrectView();
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

  async function refresh() {
    try {
      const { signups } = await fetchSignups();
      setState({ signups });
    } catch {
      // Session expired server-side while the page stayed open.
      setState({ isAdmin: false, signups: [] });
      showCorrectView();
      return;
    }
    renderParticipants(refresh);
  }
}

function renderParticipants(refresh) {
  const list = $('#participant-list');
  toggle($('#participants-empty'), state.signups.length === 0);
  replaceChildren(
    list,
    state.signups.map((signup) => participantRow(signup, refresh))
  );
}

function participantRow(signup, refresh) {
  const row = clone('tpl-participant');
  const contact = signup.email ? ` · ${signup.email}` : '';

  fill(row, {
    '.participant-name': signup.name,
    '.participant-meta': `${signup.tournamentName}${contact}`,
  });

  row.querySelector('.participant-remove').addEventListener('click', async (event) => {
    event.target.disabled = true;
    await removeSignup(signup.id).catch(() => {});
    await refresh();
  });

  return row;
}
