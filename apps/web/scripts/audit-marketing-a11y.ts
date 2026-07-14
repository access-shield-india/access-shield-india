#!/usr/bin/env tsx
/**
 * Playwright + axe automated audit for all marketing routes.
 *
 * Usage:
 *   pnpm --filter @accessshield/web dev          # terminal 1
 *   pnpm --filter @accessshield/web audit:a11y:marketing
 *
 *   BASE_URL=https://accessshield.in pnpm --filter @accessshield/web audit:a11y:marketing
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {
  AXE_IMPACT_PRIORITY,
  MARKETING_AUDIT_ROUTES,
  type MarketingRoute,
} from '../src/lib/a11y/marketing-routes';

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const REPORT_DIR = resolve(__dirname, '../a11y-reports');
const BLOG_SLUG = process.env.MARKETING_BLOG_AUDIT_SLUG;

interface RouteViolation {
  route: string;
  name: string;
  id: string;
  impact: string;
  description: string;
  help: string;
  helpUrl: string;
  nodes: number;
  targets: string[];
}

interface AuditReport {
  generatedAt: string;
  baseUrl: string;
  routesScanned: number;
  routesWithViolations: number;
  totalViolations: number;
  violations: RouteViolation[];
  skipped: Array<{ path: string; reason: string }>;
}

const KNOWN_BACKLOG: Array<{
  priority: 'P0' | 'P1' | 'P2';
  wcag: string;
  is17802?: string;
  issue: string;
  component: string;
  status: 'open' | 'fixed';
}> = [
  {
    priority: 'P0',
    wcag: '2.2.2 Pause, Stop, Hide',
    issue: 'Live ticker auto-scrolls without a pause control',
    component: 'LiveTicker.tsx',
    status: 'fixed',
  },
  {
    priority: 'P0',
    wcag: '2.4.7 Focus Visible',
    issue: 'Desktop nav and footer links missing consistent focus-visible styles',
    component: 'MarketingNav.tsx, MarketingFooter.tsx',
    status: 'fixed',
  },
  {
    priority: 'P1',
    wcag: '2.5.8 Target Size (Minimum)',
    issue: 'Mobile menu toggle below 44×44px touch target',
    component: 'MobileMenuToggle.tsx',
    status: 'fixed',
  },
  {
    priority: 'P1',
    wcag: '1.4.3 Contrast (Minimum)',
    issue: 'Gradient clip-text headline may fail contrast in some engines',
    component: 'HeroSection.tsx',
    status: 'fixed',
  },
  {
    priority: 'P1',
    wcag: '2.4.11 Focus Not Obscured',
    issue: 'Widget launcher may obscure focused elements',
    component: 'MarketingWidgetEmbed / widget.js',
    status: 'open',
  },
  {
    priority: 'P2',
    wcag: '2.4.8 Location',
    issue: 'No aria-current on active navigation item',
    component: 'MarketingNav.tsx',
    status: 'open',
  },
  {
    priority: 'P2',
    wcag: '1.1.1 Non-text Content',
    is17802: 'IS-008',
    issue: 'PDF links on guide pages need nearby HTML alternative',
    component: 'Guide pages',
    status: 'open',
  },
];

async function isReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return res.ok || res.status === 308 || res.status === 307;
  } catch {
    return false;
  }
}

async function discoverBlogSlug(page: Page): Promise<string | null> {
  if (BLOG_SLUG) return BLOG_SLUG;
  await page.goto(`${BASE_URL}/blog`, { waitUntil: 'networkidle' });
  const href = await page.locator('a[href^="/blog/"]').first().getAttribute('href');
  if (!href || href === '/blog') return null;
  return href;
}

async function auditRoute(
  page: Page,
  route: MarketingRoute,
): Promise<{ violations: RouteViolation[]; skipped?: string }> {
  const url = `${BASE_URL}${route.path}`;

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!response) {
      return { violations: [], skipped: 'No response' };
    }

    if (route.path === '/waitlist') {
      await page.waitForURL(/\/signup/, { timeout: 10000 }).catch(() => undefined);
    }

    await page.waitForTimeout(500);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .exclude('#accessshield-widget, [data-accessshield]')
      .analyze();

    const violations: RouteViolation[] = results.violations.map((v) => ({
      route: route.path,
      name: route.name,
      id: v.id,
      impact: v.impact ?? 'unknown',
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.length,
      targets: v.nodes.flatMap((n) => n.target.map(String)).slice(0, 5),
    }));

    return { violations };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { violations: [], skipped: message };
  }
}

function sortViolations(violations: RouteViolation[]): RouteViolation[] {
  return [...violations].sort((a, b) => {
    const pa = AXE_IMPACT_PRIORITY[a.impact] ?? 99;
    const pb = AXE_IMPACT_PRIORITY[b.impact] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.route.localeCompare(b.route);
  });
}

function writeFixList(report: AuditReport): void {
  const sorted = sortViolations(report.violations);
  const openBacklog = KNOWN_BACKLOG.filter((b) => b.status === 'open');

  const lines: string[] = [
    '# Marketing site accessibility — prioritized fix list',
    '',
    `Generated: ${report.generatedAt}`,
    `Base URL: ${report.baseUrl}`,
    `Routes scanned: ${report.routesScanned} · Violations: ${report.totalViolations}`,
    '',
    '## P0 — Fix immediately (WCAG / legal risk)',
    '',
  ];

  for (const item of openBacklog.filter((b) => b.priority === 'P0')) {
    lines.push(
      `- [ ] **${item.issue}** — \`${item.component}\` (${item.wcag}${item.is17802 ? `, ${item.is17802}` : ''})`,
    );
  }
  for (const v of sorted.filter((v) => v.impact === 'critical' || v.impact === 'serious')) {
    lines.push(`- [ ] **${v.id}** on \`${v.route}\` (${v.impact}): ${v.help} — ${v.nodes} node(s)`);
  }

  lines.push('', '## P1 — Fix before enterprise / govt launch', '');
  for (const item of openBacklog.filter((b) => b.priority === 'P1')) {
    lines.push(
      `- [ ] **${item.issue}** — \`${item.component}\` (${item.wcag}${item.is17802 ? `, ${item.is17802}` : ''})`,
    );
  }
  for (const v of sorted.filter((v) => v.impact === 'moderate')) {
    lines.push(`- [ ] **${v.id}** on \`${v.route}\`: ${v.help}`);
  }

  lines.push('', '## P2 — Polish & IS 17802 content', '');
  for (const item of openBacklog.filter((b) => b.priority === 'P2')) {
    lines.push(`- [ ] **${item.issue}** — \`${item.component}\` (${item.wcag ?? item.is17802})`);
  }
  for (const v of sorted.filter((v) => v.impact === 'minor')) {
    lines.push(`- [ ] **${v.id}** on \`${v.route}\`: ${v.help}`);
  }

  if (report.skipped.length > 0) {
    lines.push('', '## Skipped routes', '');
    for (const s of report.skipped) {
      lines.push(`- \`${s.path}\`: ${s.reason}`);
    }
  }

  lines.push(
    '',
    '## Manual follow-up (not fully covered by axe)',
    '',
    '- [ ] Keyboard-only journey: nav → services → scan → contact',
    '- [ ] Screen reader: NVDA/VoiceOver on homepage and /scan form',
    '- [ ] 200% zoom reflow at 320px viewport',
    '- [ ] `prefers-reduced-motion` on hero and ticker',
    '- [ ] IS-002 Hindi Unicode on any `lang="hi"` content',
    '- [ ] IS-006 INR formatting on all prices',
    '',
    '---',
    'Re-run: `pnpm --filter @accessshield/web audit:a11y:marketing`',
  );

  writeFileSync(resolve(REPORT_DIR, 'marketing-fix-list.md'), lines.join('\n'), 'utf8');
}

async function main(): Promise<void> {
  const healthUrl = `${BASE_URL}/`;
  if (!(await isReachable(healthUrl))) {
    console.error(`\n❌ Cannot reach ${healthUrl}`);
    console.error('   Start the dev server: pnpm --filter @accessshield/web dev\n');
    process.exit(1);
  }

  mkdirSync(REPORT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const allViolations: RouteViolation[] = [];
  const skipped: AuditReport['skipped'] = [];
  const routesToScan: MarketingRoute[] = [...MARKETING_AUDIT_ROUTES];

  const blogSlug = await discoverBlogSlug(page).catch(() => null);
  if (blogSlug) {
    routesToScan.push({
      path: blogSlug,
      name: `Blog post (${blogSlug})`,
      kind: 'cms',
      vitest: false,
    });
  }

  console.log(`\n🔍 Auditing ${routesToScan.length} marketing routes at ${BASE_URL}\n`);

  for (const route of routesToScan) {
    process.stdout.write(`  ${route.path} ... `);
    const { violations, skipped: skipReason } = await auditRoute(page, route);
    if (skipReason) {
      skipped.push({ path: route.path, reason: skipReason });
      console.log(`SKIP (${skipReason})`);
    } else if (violations.length === 0) {
      console.log('✓');
    } else {
      console.log(`${violations.length} violation(s)`);
      allViolations.push(...violations);
    }
  }

  await browser.close();

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    routesScanned: routesToScan.length,
    routesWithViolations: new Set(allViolations.map((v) => v.route)).size,
    totalViolations: allViolations.reduce((sum, v) => sum + v.nodes, 0),
    violations: sortViolations(allViolations),
    skipped,
  };

  writeFileSync(
    resolve(REPORT_DIR, 'marketing-audit.json'),
    JSON.stringify(report, null, 2),
    'utf8',
  );
  writeFixList(report);

  console.log(`\n📄 ${resolve(REPORT_DIR, 'marketing-audit.json')}`);
  console.log(`📋 ${resolve(REPORT_DIR, 'marketing-fix-list.md')}`);
  console.log(
    `\nSummary: ${report.totalViolations} affected node(s) across ${report.routesWithViolations} route(s)\n`,
  );

  if (report.totalViolations > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
