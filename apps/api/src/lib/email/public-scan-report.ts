/**
 * Build and send the free-scan summary email when a public scan completes.
 */

import { and, count, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '@accessshield/db';
import { assets, scans, violations } from '@accessshield/db';
import type { Redis } from 'ioredis';
import { logger } from '../logger';
import { PUBLIC_SCANS_ORG_ID } from '../../scanner/public-scan-org';
import { sendEmail } from './resend';

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://accessiblenow.in';
const LEAD_KEY = (scanId: string) => `public-scan:lead:${scanId}`;
const SENT_KEY = (scanId: string) => `public-scan:email-sent:${scanId}`;

/** Ops copy of every free-scan report (override via PUBLIC_SCAN_REPORT_BCC; empty to disable). */
const PUBLIC_SCAN_REPORT_BCC =
  process.env.PUBLIC_SCAN_REPORT_BCC ?? 'nilesh.varma@gmail.com';

interface SeverityCounts {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
}

interface TopViolation {
  ruleId: string;
  impact: string;
  description: string;
  wcagCriteria: string[] | null;
}

export interface PublicScanReportPayload {
  scanId: string;
  email: string;
  siteUrl: string;
  score: number;
  pagesScanned: number;
  totalViolations: number;
  severity: SeverityCounts;
  topViolations: TopViolation[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function impactLabel(impact: string): string {
  switch (impact) {
    case 'critical':
      return 'Critical';
    case 'serious':
      return 'Serious';
    case 'moderate':
      return 'Moderate';
    case 'minor':
      return 'Minor';
    default:
      return impact;
  }
}

/** Exported for unit tests */
export function buildPublicScanReportHtml(payload: PublicScanReportPayload): string {
  const appUrl = APP_URL();
  const resultsUrl = `${appUrl}/scan`;
  const signupUrl = `${appUrl}/signup`;
  const remaining = Math.max(0, payload.totalViolations - payload.topViolations.length);

  const violationRows = payload.topViolations
    .map(
      (v) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;vertical-align:top;">
          <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;background:#F3F4F6;color:#1A1A2E;">
            ${escapeHtml(impactLabel(v.impact))}
          </span>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;">
          <div style="font-weight:600;color:#1A1A2E;font-size:14px;">${escapeHtml(v.ruleId)}</div>
          <div style="margin-top:4px;color:#374151;font-size:14px;line-height:1.5;">${escapeHtml(v.description)}</div>
          ${
            v.wcagCriteria && v.wcagCriteria.length > 0
              ? `<div style="margin-top:6px;color:#6B7280;font-size:12px;">WCAG: ${escapeHtml(v.wcagCriteria.join(', '))}</div>`
              : ''
          }
        </td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Your free accessibility scan</title></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Inter,Segoe UI,system-ui,sans-serif;color:#1A1A2E;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:600px;background:#FFFFFF;border:1px solid #D1D5DB;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px;background:#3B0764;color:#FFFFFF;">
              <div style="font-size:20px;font-weight:700;">AccessibleNow</div>
              <div style="margin-top:6px;font-size:14px;opacity:0.9;">Free accessibility scan report</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 12px;font-size:16px;line-height:1.5;">
                Here is a summary of the accessibility scan for
                <strong>${escapeHtml(payload.siteUrl)}</strong>.
              </p>
              <table role="presentation" width="100%" style="margin:20px 0;background:#FAF5FF;border-radius:10px;">
                <tr>
                  <td style="padding:20px;text-align:center;">
                    <div style="font-size:48px;font-weight:700;color:#5B21B6;line-height:1;">${payload.score}</div>
                    <div style="margin-top:6px;font-size:14px;color:#374151;">Accessibility score / 100</div>
                    <div style="margin-top:12px;font-size:14px;color:#374151;">
                      ${payload.pagesScanned} page(s) scanned · ${payload.totalViolations} issue(s) found
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:14px;color:#374151;">
                <strong>${payload.severity.critical}</strong> critical ·
                <strong>${payload.severity.serious}</strong> serious ·
                <strong>${payload.severity.moderate}</strong> moderate ·
                <strong>${payload.severity.minor}</strong> minor
              </p>
              ${
                payload.topViolations.length > 0
                  ? `
              <h2 style="margin:24px 0 12px;font-size:18px;color:#1A1A2E;">Top issues</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
                ${violationRows}
              </table>
              ${
                remaining > 0
                  ? `<p style="margin:12px 0 0;font-size:14px;color:#374151;">
                      Plus <strong>${remaining}</strong> more issue(s) — sign up free to unlock the full list, AI fix suggestions, and compliance reports.
                    </p>`
                  : ''
              }`
                  : `<p style="margin:20px 0 0;font-size:14px;color:#374151;">
                      No automated issues were found on the pages we could scan. A human audit can still catch deeper problems.
                    </p>`
              }
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="border-radius:6px;background:#6D28D9;">
                    <a href="${escapeHtml(signupUrl)}" style="display:inline-block;padding:12px 20px;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;">
                      Get the full report free
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:13px;color:#6B7280;line-height:1.5;">
                You can also start another free scan at
                <a href="${escapeHtml(resultsUrl)}" style="color:#6D28D9;">${escapeHtml(resultsUrl)}</a>.
                This is an automated check (WCAG 2.2 AA + IS 17802 sample) — not a full legal audit.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:#F9FAFB;border-top:1px solid #E5E7EB;font-size:12px;color:#6B7280;">
              AccessibleNow · accessibility compliance for Indian organisations<br>
              Scan ID: ${escapeHtml(payload.scanId)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildPublicScanReportText(payload: PublicScanReportPayload): string {
  const appUrl = APP_URL();
  const lines = [
    'AccessibleNow — Free accessibility scan report',
    '',
    `Site: ${payload.siteUrl}`,
    `Score: ${payload.score}/100`,
    `Pages scanned: ${payload.pagesScanned}`,
    `Issues found: ${payload.totalViolations}`,
    `Critical: ${payload.severity.critical}, Serious: ${payload.severity.serious}, Moderate: ${payload.severity.moderate}, Minor: ${payload.severity.minor}`,
    '',
    'Top issues:',
  ];

  if (payload.topViolations.length === 0) {
    lines.push('(none from this automated pass)');
  } else {
    for (const v of payload.topViolations) {
      lines.push(`- [${impactLabel(v.impact)}] ${v.ruleId}: ${v.description}`);
    }
  }

  lines.push(
    '',
    `Unlock the full report: ${appUrl}/signup`,
    `Scan another site: ${appUrl}/scan`,
    `Scan ID: ${payload.scanId}`,
  );

  return lines.join('\n');
}

async function loadReportPayload(
  db: Database,
  scanId: string,
  email: string,
): Promise<PublicScanReportPayload | null> {
  const [scan] = await db
    .select({
      id: scans.id,
      score: scans.score,
      pagesScanned: scans.pagesScanned,
      assetId: scans.assetId,
    })
    .from(scans)
    .where(and(eq(scans.id, scanId), eq(scans.organisationId, PUBLIC_SCANS_ORG_ID)))
    .limit(1);

  if (!scan) return null;

  const [asset] = await db
    .select({ url: assets.url })
    .from(assets)
    .where(and(eq(assets.id, scan.assetId), eq(assets.organisationId, PUBLIC_SCANS_ORG_ID)))
    .limit(1);

  const severityRows = await db
    .select({
      impact: violations.impact,
      count: count(),
    })
    .from(violations)
    .where(eq(violations.scanId, scanId))
    .groupBy(violations.impact);

  const severity: SeverityCounts = {
    critical: Number(severityRows.find((r) => r.impact === 'critical')?.count ?? 0),
    serious: Number(severityRows.find((r) => r.impact === 'serious')?.count ?? 0),
    moderate: Number(severityRows.find((r) => r.impact === 'moderate')?.count ?? 0),
    minor: Number(severityRows.find((r) => r.impact === 'minor')?.count ?? 0),
  };

  const topViolations = await db
    .select({
      ruleId: violations.ruleId,
      impact: violations.impact,
      description: violations.description,
      wcagCriteria: violations.wcagCriteria,
    })
    .from(violations)
    .where(eq(violations.scanId, scanId))
    .orderBy(
      sql`CASE ${violations.impact}
        WHEN 'critical' THEN 1
        WHEN 'serious' THEN 2
        WHEN 'moderate' THEN 3
        WHEN 'minor' THEN 4
      END`,
      desc(violations.createdAt),
    )
    .limit(5);

  const [totalRow] = await db
    .select({ count: count() })
    .from(violations)
    .where(eq(violations.scanId, scanId));

  return {
    scanId,
    email,
    siteUrl: asset?.url ?? 'your website',
    score: Math.round(scan.score ?? 0),
    pagesScanned: scan.pagesScanned ?? 0,
    totalViolations: Number(totalRow?.count ?? 0),
    severity,
    topViolations,
  };
}

/**
 * If this scan belongs to the public free-scan org and a lead email was stored,
 * send a summary report. Safe to call multiple times (Redis idempotency).
 */
export async function maybeSendPublicScanReportEmail(
  db: Database,
  redis: Redis,
  params: { scanId: string; orgId: string },
): Promise<void> {
  const { scanId, orgId } = params;
  if (orgId !== PUBLIC_SCANS_ORG_ID) return;

  const alreadySent = await redis.get(SENT_KEY(scanId));
  if (alreadySent) {
    logger.info({ scanId }, 'Public scan report email already sent — skipping');
    return;
  }

  const email = await redis.get(LEAD_KEY(scanId));
  if (!email) {
    logger.warn({ scanId }, 'No lead email for public scan — cannot send report');
    return;
  }

  const payload = await loadReportPayload(db, scanId, email);
  if (!payload) {
    logger.warn({ scanId }, 'Public scan not found for report email');
    return;
  }

  const result = await sendEmail({
    to: email,
    bcc: PUBLIC_SCAN_REPORT_BCC || undefined,
    subject: `Your accessibility score: ${payload.score}/100 — ${payload.siteUrl}`,
    html: buildPublicScanReportHtml(payload),
    text: buildPublicScanReportText(payload),
    idempotencyKey: `public-scan-report:${scanId}`,
  });

  if (result.ok) {
    await redis.setex(SENT_KEY(scanId), 2592000, result.id ?? '1');
    logger.info({ scanId, emailId: result.id }, 'Public scan report email sent');
    return;
  }

  if (result.skipped) {
    logger.warn({ scanId }, 'Public scan report email skipped (email provider not configured)');
    return;
  }

  logger.error({ scanId, error: result.error }, 'Failed to send public scan report email');
}
