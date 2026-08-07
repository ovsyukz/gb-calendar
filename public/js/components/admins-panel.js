import { $, clone, fill, replaceChildren, setMessage } from '../lib/dom.js';
import { fetchAdmins, addAdmin } from '../lib/api.js';

/** The Admins dialog: who has access, and a form to add someone. */
export function mountAdminsPanel() {
  const dialog = $('#admins-dialog');
  const form = $('#add-admin-form');
  const message = $('#add-admin-message');

  async function refresh() {
    const { admins } = await fetchAdmins();
    replaceChildren($('#admin-list'), admins.map(row));
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
      replaceChildren($('#admin-list'), admins.map(row));

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

function row(admin) {
  const node = clone('tpl-admin');

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
  return node;
}
