import type { Database } from '@accessshield/db';
import { assets, issues, organisations, violations } from '@accessshield/db';
import { and, eq } from 'drizzle-orm';
import { requestAiAltText, requestAiFix } from '../lib/ai-client';
import {
  buildDevMockAltText,
  buildDevMockFix,
  isDevPreviewAiFix,
  stripDevPreviewComment,
} from '../lib/dev-mock-ai';
import { getPlanFeatures } from '../lib/plan-limits';
import { logger } from '../lib/logger';

export interface IssueAiEnrichment {
  aiFixSuggestion: string | null;
  aiExplanation: string | null;
  aiAltText: string | null;
  aiFixDevPreview?: boolean;
  aiFixBefore?: string | null;
  aiFixAfter?: string | null;
}

/** Dev mock only when the AI service cannot be reached — not for Claude/model errors. */
function isAiServiceUnreachable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes('fetch failed') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('not configured') ||
    message.includes('AI service is temporarily unavailable')
  );
}

function buildAiFixEnrichment(row: {
  elementHtml: string;
  aiFix: string | null;
  aiExplanation: string | null;
  aiAltText: string | null;
}): IssueAiEnrichment {
  const devPreview = isDevPreviewAiFix(row.aiExplanation, row.aiFix);
  const afterHtml = row.aiFix ? stripDevPreviewComment(row.aiFix) : null;

  return {
    aiFixSuggestion: afterHtml,
    aiExplanation: row.aiExplanation,
    aiAltText: row.aiAltText,
    aiFixDevPreview: devPreview,
    aiFixBefore: row.elementHtml || null,
    aiFixAfter: afterHtml,
  };
}

async function loadIssueViolation(
  db: Database,
  orgId: string,
  issueId: string,
): Promise<{
  issueId: string;
  assetId: string;
  violationId: string;
  planTier: string;
  ruleId: string;
  elementHtml: string;
  wcagCriterion: string;
  pageUrl: string;
  description: string;
  aiFix: string | null;
  aiExplanation: string | null;
  aiAltText: string | null;
} | null> {
  const [row] = await db
    .select({
      issueId: issues.id,
      assetId: issues.assetId,
      violationId: violations.id,
      planTier: organisations.planTier,
      ruleId: violations.ruleId,
      elementHtml: violations.html,
      wcagCriterion: violations.wcagCriteria,
      pageUrl: violations.pageUrl,
      description: violations.description,
      aiFix: violations.aiFix,
      aiExplanation: violations.aiExplanation,
      aiAltText: violations.aiAltText,
    })
    .from(issues)
    .innerJoin(violations, eq(issues.violationId, violations.id))
    .innerJoin(organisations, eq(issues.organisationId, organisations.id))
    .where(and(eq(issues.id, issueId), eq(issues.organisationId, orgId)))
    .limit(1);

  if (!row?.violationId) {
    return null;
  }

  return {
    issueId: row.issueId,
    assetId: row.assetId,
    violationId: row.violationId,
    planTier: row.planTier ?? 'starter',
    ruleId: row.ruleId,
    elementHtml: row.elementHtml ?? '',
    wcagCriterion: row.wcagCriterion?.[0] ?? '2.4.4',
    pageUrl: row.pageUrl ?? '',
    description: row.description,
    aiFix: row.aiFix,
    aiExplanation: row.aiExplanation,
    aiAltText: row.aiAltText,
  };
}

export async function generateIssueAiFix(
  db: Database,
  orgId: string,
  issueId: string,
): Promise<IssueAiEnrichment> {
  const row = await loadIssueViolation(db, orgId, issueId);
  if (!row) {
    throw new Error('Issue not found');
  }

  const features = getPlanFeatures(row.planTier);
  if (!features.aiRemediation) {
    throw new Error('AI remediation is not available on your plan');
  }

  // Skip cached dev mocks so a fixed AI service can regenerate real Claude fixes.
  if (row.aiFix && !isDevPreviewAiFix(row.aiExplanation, row.aiFix)) {
    return buildAiFixEnrichment(row);
  }

  let fixHtml = '';
  let explanation = '';
  let fixBefore: string | null = row.elementHtml || null;
  let fixAfter: string | null = null;
  let fixDevPreview = false;

  try {
    const response = await requestAiFix(
      {
        rule_id: row.ruleId,
        element_html: row.elementHtml,
        wcag_criterion: row.wcagCriterion,
        standard: 'WCAG22',
        page_context: `${row.pageUrl} — ${row.description}`.slice(0, 500),
        violation_id: row.violationId,
      },
      orgId,
      row.planTier,
    );
    fixHtml = response.fix_html?.trim() ?? '';
    explanation = response.explanation?.trim() ?? '';
    fixBefore = response.before_after?.before?.trim() || row.elementHtml || null;
    fixAfter = response.before_after?.after?.trim() || fixHtml || null;
  } catch (err) {
    if (process.env.NODE_ENV === 'production' || !isAiServiceUnreachable(err)) {
      throw err;
    }
    logger.warn(
      { err, issueId, violationId: row.violationId },
      'AI service unreachable — using dev fallback',
    );
    const mock = buildDevMockFix(row.ruleId, row.elementHtml, row.description, row.wcagCriterion);
    fixHtml = mock.fixHtml;
    explanation = mock.explanation;
    fixBefore = mock.beforeHtml;
    fixAfter = mock.afterHtml;
    fixDevPreview = true;
  }

  if (!fixHtml && !explanation) {
    logger.warn({ issueId, violationId: row.violationId }, 'AI fix returned empty result');
    throw new Error('AI fix generation returned no content');
  }

  await db
    .update(violations)
    .set({
      aiFix: fixHtml || row.elementHtml,
      aiExplanation: explanation || null,
    })
    .where(and(eq(violations.id, row.violationId), eq(violations.organisationId, orgId)));

  const storedFix = fixHtml || row.elementHtml;
  const afterHtml = fixAfter ?? storedFix;

  return {
    aiFixSuggestion: afterHtml,
    aiExplanation: explanation || null,
    aiAltText: row.aiAltText,
    aiFixDevPreview: fixDevPreview,
    aiFixBefore: fixBefore,
    aiFixAfter: afterHtml,
  };
}

export async function generateIssueAiAltText(
  db: Database,
  orgId: string,
  issueId: string,
): Promise<IssueAiEnrichment> {
  const row = await loadIssueViolation(db, orgId, issueId);
  if (!row) {
    throw new Error('Issue not found');
  }

  const features = getPlanFeatures(row.planTier);
  if (!features.aiRemediation) {
    throw new Error('AI remediation is not available on your plan');
  }

  if (row.aiAltText) {
    return {
      aiFixSuggestion: row.aiFix,
      aiExplanation: row.aiExplanation,
      aiAltText: row.aiAltText,
    };
  }

  const [asset] = await db
    .select({ url: assets.url })
    .from(assets)
    .where(and(eq(assets.id, row.assetId), eq(assets.organisationId, orgId)))
    .limit(1);

  let altText = '';

  try {
    const response = await requestAiAltText(
      {
        image_url: row.pageUrl,
        page_context: asset?.url ?? row.pageUrl,
        element_html: row.elementHtml,
        page_lang: 'en',
        asset_id: row.assetId,
        violation_id: row.violationId,
      },
      orgId,
      row.planTier,
    );
    altText = response.alt_text?.trim() ?? '';
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }
    logger.warn({ err, issueId }, 'AI alt-text failed — using dev fallback');
    altText = buildDevMockAltText(row.ruleId);
  }

  if (!altText) {
    throw new Error('AI alt-text generation returned no content');
  }

  await db
    .update(violations)
    .set({ aiAltText: altText })
    .where(and(eq(violations.id, row.violationId), eq(violations.organisationId, orgId)));

  return {
    aiFixSuggestion: row.aiFix,
    aiExplanation: row.aiExplanation,
    aiAltText: altText,
  };
}
