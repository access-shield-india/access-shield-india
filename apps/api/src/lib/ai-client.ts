import { logger } from './logger';

/** Read at request time — module-level reads miss .env.local loaded after import hoisting. */
function getAiServiceConfig(): { url: string; internalKey: string } {
  return {
    url: (process.env.AI_SERVICE_URL ?? 'http://localhost:8001').replace(/\/$/, ''),
    internalKey: process.env.INTERNAL_AI_SERVICE_KEY ?? '',
  };
}

export interface AiFixRequestBody {
  rule_id: string;
  element_html: string;
  wcag_criterion: string;
  standard: string;
  page_context: string;
  violation_id: string;
}

export interface AiFixResponseBody {
  fix_html: string;
  explanation: string;
  aria_fix?: Record<string, string>;
  before_after?: { before?: string; after?: string };
  is_quick_win?: boolean;
  cached?: boolean;
}

export interface AiAltTextRequestBody {
  image_url: string;
  page_context: string;
  element_html: string;
  page_lang?: string;
  asset_id: string;
  violation_id: string;
}

export interface AiAltTextResponseBody {
  alt_text: string;
  confidence?: string;
  cached?: boolean;
}

function aiHeaders(orgId: string, planTier: string, internalKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Key': internalKey,
    'X-Org-Id': orgId,
    'X-Org-Plan': planTier,
  };
}

export async function requestAiFix(
  body: AiFixRequestBody,
  orgId: string,
  planTier: string,
): Promise<AiFixResponseBody> {
  const { url, internalKey } = getAiServiceConfig();

  if (!internalKey) {
    throw new Error('AI service is not configured (INTERNAL_AI_SERVICE_KEY missing)');
  }

  const response = await fetch(`${url}/ai/fix`, {
    method: 'POST',
    headers: aiHeaders(orgId, planTier, internalKey),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const message =
      (detail && typeof detail === 'object' && 'detail' in detail && String(detail.detail)) ||
      (detail && typeof detail === 'object' && 'title' in detail && String(detail.title)) ||
      `AI service error (${response.status})`;
    logger.error({ status: response.status, message, orgId }, 'AI fix request failed');
    throw new Error(message);
  }

  return (await response.json()) as AiFixResponseBody;
}

export async function requestAiAltText(
  body: AiAltTextRequestBody,
  orgId: string,
  planTier: string,
): Promise<AiAltTextResponseBody> {
  const { url, internalKey } = getAiServiceConfig();

  if (!internalKey) {
    throw new Error('AI service is not configured (INTERNAL_AI_SERVICE_KEY missing)');
  }

  const response = await fetch(`${url}/ai/alt-text`, {
    method: 'POST',
    headers: aiHeaders(orgId, planTier, internalKey),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    logger.error({ status: response.status, detail, orgId }, 'AI alt-text request failed');
    throw new Error('AI alt-text generation failed');
  }

  return (await response.json()) as AiAltTextResponseBody;
}
