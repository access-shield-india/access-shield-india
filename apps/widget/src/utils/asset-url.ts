/** Captured while the IIFE evaluates so later async work still knows the script URL */
const SCRIPT_SRC =
  typeof document !== 'undefined'
    ? ((document.currentScript as HTMLScriptElement | null)?.src ?? '')
    : '';

/** Directory of the widget script (for lazy chunks: i18n/*.json, analytics.min.js) */
export function getAssetBaseUrl(): string {
  const src =
    SCRIPT_SRC ||
    (typeof document !== 'undefined'
      ? (document.querySelector<HTMLScriptElement>('script[data-token]')?.src ?? '')
      : '');
  const slash = src.lastIndexOf('/');
  return slash === -1 ? './' : src.slice(0, slash + 1);
}

export function getAssetUrl(relativePath: string): string {
  return `${getAssetBaseUrl()}${relativePath}`;
}
