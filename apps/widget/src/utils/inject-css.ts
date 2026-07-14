const STYLE_PREFIX = 'as-widget-style-';

/** Inject or update a tagged stylesheet on the host page */
export function injectStyle(id: string, css: string): void {
  const fullId = `${STYLE_PREFIX}${id}`;
  let el = document.getElementById(fullId);
  if (!el) {
    el = document.createElement('style');
    el.id = fullId;
    el.setAttribute('data-accessshield', 'true');
    document.head.appendChild(el);
  }
  el.textContent = css;
}

/** Remove a single injected stylesheet by id */
export function removeStyle(id: string): void {
  document.getElementById(`${STYLE_PREFIX}${id}`)?.remove();
}

/** Remove all AccessShield-injected styles and elements from host page */
export function removeAllInjected(): void {
  document.querySelectorAll('[data-accessshield="true"]').forEach((el) => el.remove());
}

/** Inject a host-page element tagged for cleanup */
export function injectElement(id: string, tag: string): HTMLElement {
  const fullId = `as-widget-el-${id}`;
  let el = document.getElementById(fullId);
  if (!el) {
    el = document.createElement(tag);
    el.id = fullId;
    el.setAttribute('data-accessshield', 'true');
    document.body.appendChild(el);
  }
  return el;
}

/** Remove a single injected element */
export function removeElement(id: string): void {
  document.getElementById(`as-widget-el-${id}`)?.remove();
}
