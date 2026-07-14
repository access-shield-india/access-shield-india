# Marketing site accessibility — fix backlog

Tracked issues for WCAG 2.2 AA and IS 17802 alignment on `accessshield.in` marketing pages.

## How to audit

```bash
# Component tests — all 20 marketing pages (CI)
pnpm --filter @accessshield/web test:a11y

# Full-page Playwright + axe (requires running server)
pnpm --filter @accessshield/web dev
pnpm --filter @accessshield/web audit:a11y:marketing
```

Reports: `apps/web/a11y-reports/marketing-audit.json` and `marketing-fix-list.md` (gitignored, generated on each audit run).

Route registry: `apps/web/src/lib/a11y/marketing-routes.ts`

## Fixed (component tests passing)

- [x] Live ticker pause control — WCAG 2.2.2 (`LiveTicker.tsx`)
- [x] Nav/footer focus-visible rings — WCAG 2.4.7
- [x] Mobile menu 44×44px targets — WCAG 2.5.8
- [x] Hero headline solid contrast — WCAG 1.4.3
- [x] Duplicate `<main>` landmarks on guide/blog pages
- [x] `role="list"` without `listitem` in hero badges — ARIA
- [x] Testimonial star ratings `role="img"` — ARIA
- [x] Footer heading hierarchy (`h2` section titles)
- [x] Blog empty state heading order (`h2` not `h3`)
- [x] Vitest suite covers all 20 static marketing routes

## P1 — Open (Playwright audit / manual)

- [ ] Widget launcher focus obscured — WCAG 2.4.11
- [ ] Scan form live region during polling — WCAG 4.1.3
- [ ] Full `color-contrast` pass via `audit:a11y:marketing` (disabled in jsdom tests)

## P2 — Open

- [ ] `aria-current="page"` on active nav item — WCAG 2.4.8
- [ ] PDF links on guide pages need HTML alternative nearby — IS-008
- [ ] Sanity blog: enforce alt text + heading hierarchy in CMS schema
- [ ] Dynamic blog post route in Playwright audit (uses first post or `MARKETING_BLOG_AUDIT_SLUG`)

## Manual QA (required for sign-off)

- [ ] Keyboard-only: home → services → scan → contact
- [ ] NVDA / VoiceOver on `/` and `/scan`
- [ ] 200% zoom, 320px reflow
- [ ] `prefers-reduced-motion` on hero + ticker
- [ ] Hindi `lang="hi"` uses Unicode Devanagari — IS-002
