/**
 * The Show/Hide control inside every password field.
 *
 * Typing a long password blind is where people give up and pick a weaker one,
 * so every `.password-toggle` in the markup flips its field between dots and
 * plain text.
 *
 * The field is put back to dots whenever its form is reset or its dialog is
 * closed: a revealed password left on screen would otherwise still be there
 * the next time the dialog opens.
 */
export function mountPasswordReveal(root = document) {
  for (const button of root.querySelectorAll('.password-toggle')) {
    // aria-controls holds a document-wide id, so resolve it against document
    // even when this is mounted over a subtree.
    const input = document.getElementById(button.getAttribute('aria-controls'));
    if (!input) continue;

    const show = (visible) => {
      input.type = visible ? 'text' : 'password';
      button.textContent = visible ? 'Hide' : 'Show';
      button.setAttribute('aria-pressed', String(visible));
    };

    button.addEventListener('click', () => {
      // Changing an input's type moves the caret to the end in some browsers,
      // which loses the spot of anyone mid-edit. Put it back.
      const { selectionStart, selectionEnd } = input;
      show(input.type === 'password');
      input.focus();
      if (selectionStart !== null) input.setSelectionRange(selectionStart, selectionEnd);
    });

    input.form?.addEventListener('reset', () => show(false));

    // Watch the dialog's `open` attribute rather than listening for its
    // `close` event. The attribute is state and is always there to read; the
    // event was not observed to fire at all while testing this in Chrome, and
    // a password left in plain sight is not worth the risk of relying on it.
    //
    // Only act on the close. Observer callbacks run at the microtask
    // checkpoint, so resetting on every change means opening a dialog queues
    // a reset that lands after — and quietly undoes — a reveal clicked
    // immediately afterwards.
    const dialog = input.closest('dialog');
    if (dialog) {
      new MutationObserver(() => {
        if (!dialog.open) show(false);
      }).observe(dialog, { attributeFilter: ['open'] });
    }
  }
}
