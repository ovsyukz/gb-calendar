import { $, clone, fill, replaceChildren, toggle, setMessage } from '../lib/dom.js';
import { fetchAdmins, addAdmin, removeAdmin } from '../lib/api.js';

/** The Admins dialog: who has access, add someone, remove someone. */
export function mountAdminsPanel() {
  const dialog = $('#admins-dialog');
  const form = $('#add-admin-form');
  const message = $('#add-admin-message');

  function show(admins) {
    toggle($('#admins-empty'), admins.length === 0);
    replaceChildren(
      $('#admin-list'),
      admins.map((a) => row(a, admins.length, refresh))
    );
  }

  async function refresh() {
    show(await fetchAdmins().then((r) => r.admins));
  }

  $('#open-admins').addEventListener('click', async () => {
    setMessage(message, '');
    dialog.showModal();
    await refresh().catch(() => dialog.close());
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      const { admins } = await addAdmin({
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        password: form.elements.password.value,
      });
      show(admins);

      // Show the password back once, since it is the only time anyone can
      // read it — it is stored as a one-way hash.
      const temporary = form.elements.password.value;
      const who = form.elements.email.value.trim();
      form.reset();
      setMessage(
        message,
        `Added ${who}. Give them the password: ${temporary}`,
        'success'
      );
    } catch (failure) {
      setMessage(message, failure.message, 'error');
    }
  });
}

function row(admin, total, onChange) {
  const node = clone('tpl-admin');
  const remove = node.querySelector('.admin-remove');

  fill(node, {
    '.admin-name': admin.name,
    '.admin-email': admin.email,
    '.admin-status': admin.mustChangePassword
      ? 'password not set'
      : admin.lastLoginAt
        ? 'active'
        : 'never signed in',
  });

  if (admin.mustChangePassword) {
    node.querySelector('.admin-status').classList.add('is-pending');
  }

  // No button on your own row, and none when this is the only account — the
  // server refuses both, so offering it would just produce an error.
  if (admin.isYou || total <= 1) {
    remove.remove();
    return node;
  }

  remove.addEventListener('click', async (event) => {
    event.target.disabled = true;
    await removeAdmin(admin.id).catch(() => {});
    await onChange();
  });

  return node;
}
