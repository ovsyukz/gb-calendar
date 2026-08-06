/**
 * Small helpers over <template> cloning, so no component reimplements DOM
 * plumbing. Everything here sets text via textContent, never innerHTML —
 * a tournament name or an athlete's name is never parsed as markup.
 */

export const $ = (selector, root = document) => root.querySelector(selector);

/** Clones a <template> by id and returns its first element. */
export function clone(templateId) {
  const template = document.getElementById(templateId);
  if (!template) throw new Error(`No <template id="${templateId}">`);
  return template.content.firstElementChild.cloneNode(true);
}

/** Sets textContent on each `selector: text` pair found inside `root`. */
export function fill(root, values) {
  for (const [selector, text] of Object.entries(values)) {
    const node = root.querySelector(selector);
    if (node) node.textContent = text;
  }
  return root;
}

/** Replaces a container's children in one go. */
export function replaceChildren(container, nodes) {
  container.replaceChildren(...nodes);
}

/** Shows or hides an element using the `hidden` attribute. */
export function toggle(element, visible) {
  element.hidden = !visible;
}

export function setMessage(element, text, kind) {
  element.textContent = text;
  element.className = `form-message${kind ? ` ${kind}` : ''}`;
  element.hidden = !text;
}
