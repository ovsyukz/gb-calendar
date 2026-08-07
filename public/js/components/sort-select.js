/**
 * Fills a <select> with sort options and reports changes.
 *
 * Safe to call on every render: the options are only rebuilt the first time,
 * so re-rendering a list does not reset what the admin chose or steal focus
 * mid-interaction.
 */
export function mountSortSelect(select, options, current, onChange) {
  if (!select.dataset.ready) {
    select.replaceChildren(
      ...Object.entries(options).map(([value, label]) => new Option(label, value))
    );
    select.addEventListener('change', () => onChange(select.value));
    select.dataset.ready = 'true';
  }
  select.value = current;
}
