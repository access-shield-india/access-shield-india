/** Generate a URL-safe organisation slug from a company name. */
export function slugifyCompanyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Append numeric suffix until unique against existing slugs. */
export function uniqueSlug(base: string, existingSlugs: Set<string>): string {
  let candidate = base || 'org';
  let suffix = 0;

  while (existingSlugs.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}
