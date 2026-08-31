/**
 * Thin Resend HTTP client (no SDK dependency).
 * Requires RESEND_API_KEY. Optional EMAIL_FROM.
 */

import { logger } from '../logger';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Optional BCC recipients (Resend accepts string or string[]) */
  bcc?: string | string[];
  idempotencyKey?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  skipped?: boolean;
  error?: string;
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM ?? 'AccessibleNow <noreply@accessiblenow.in>';
}

/**
 * Send a transactional email via Resend.
 * Returns skipped:true when RESEND_API_KEY is unset (scan must not fail).
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn('RESEND_API_KEY not set — skipping email send');
    return { ok: false, skipped: true, error: 'RESEND_API_KEY not set' };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (params.idempotencyKey) {
    headers['Idempotency-Key'] = params.idempotencyKey;
  }

  try {
    const payload: Record<string, unknown> = {
      from: getFromAddress(),
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    };
    if (params.bcc) {
      const bccList = Array.isArray(params.bcc) ? params.bcc : [params.bcc];
      const filtered = bccList.map((a) => a.trim()).filter(Boolean);
      if (filtered.length > 0) {
        payload.bcc = filtered;
      }
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    const responseBody = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!response.ok) {
      const error = responseBody.message ?? responseBody.name ?? `HTTP ${response.status}`;
      logger.error({ status: response.status, error }, 'Resend email send failed');
      return { ok: false, error };
    }

    return { ok: true, id: responseBody.id };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown email error';
    logger.error({ err }, 'Resend email request failed');
    return { ok: false, error };
  }
}
