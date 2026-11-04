/**
 * Free-scan email drip (Resend): findings → remediation value → audit CTA.
 * Fire-and-forget; skips when RESEND_API_KEY is unset.
 */

import type { Database } from '@accessshield/db';
import { logger } from '../lib/logger';
import { sendEmail } from '../lib/email/resend';

const DRIP_SUBJECTS = [
  'Your accessibility scan findings — AccessibleNow',
  'Fix barriers faster with Developer AI guidance',
  'Need RPwD / SEBI evidence? Book a compliance audit',
] as const;

function dripBodies(scanId?: string): string[] {
  const scanNote = scanId ? ` (scan ${scanId})` : '';
  return [
    `<p>Your free website scan${scanNote} is ready. Automated tools found issues — but <strong>automated scanning alone cannot establish full WCAG, RPwD, IS 17802, GIGW, or SEBI conformance</strong>.</p>
     <p><a href="https://accessiblenow.in/scan">Review your summary</a> · <a href="https://accessiblenow.in/signup?plan=developer">Start Developer (₹1,499/mo)</a></p>`,
    `<p>Developer unlocks detailed findings, limited AI remediation guidance, and 10 scans/month — so your team can start fixing what the free scan only summarised.</p>
     <p><a href="https://accessiblenow.in/signup?plan=developer">Upgrade to Developer</a> · <a href="https://accessiblenow.in/pricing">See pricing</a></p>`,
    `<p>Banks, PSUs, and listed companies usually need a documented accessibility audit plus monitoring. Book expert services or talk to us about an Enterprise programme.</p>
     <p><a href="https://accessiblenow.in/contact?service=audit-web">Book compliance audit</a> · <a href="https://accessiblenow.in/contact?plan=enterprise">Enterprise quote</a></p>`,
  ];
}

/**
 * Sends the 3-mail sequence immediately spaced by index (day 0 / stub).
 * Production can replace with a delayed job queue; MVP sends mail 1 now and logs 2–3.
 */
export async function maybeEnqueueScanDrip(
  _db: Database,
  email: string,
  scanId?: string,
): Promise<void> {
  const bodies = dripBodies(scanId);
  try {
    const html = bodies[0]!;
    const first = await sendEmail({
      to: email,
      subject: DRIP_SUBJECTS[0],
      html,
      text: html.replace(/<[^>]+>/g, ' '),
    });
    logger.info(
      { email, scanId, ok: first.ok, skipped: first.skipped },
      'Scan drip mail 1 processed',
    );
    // Stub schedule for mails 2–3 — log intent for ops / future worker
    logger.info(
      {
        email,
        pending: [
          { day: 2, subject: DRIP_SUBJECTS[1] },
          { day: 5, subject: DRIP_SUBJECTS[2] },
        ],
      },
      'Scan drip mails 2–3 scheduled (stub)',
    );
  } catch (err) {
    logger.warn({ err, email }, 'Scan drip failed');
  }
}
