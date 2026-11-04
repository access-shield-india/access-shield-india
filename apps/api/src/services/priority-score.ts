/**
 * Issue priority scoring (AN-F007).
 * Weights are 0–1 and match priority_configs defaults.
 */

export interface PriorityWeights {
  userImpact: number;
  regulatoryWeight: number;
  atCoverage: number;
  inverseFixComplexity: number;
}

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  userImpact: 0.4,
  regulatoryWeight: 0.3,
  atCoverage: 0.2,
  inverseFixComplexity: 0.1,
};

export interface PriorityInput {
  id: string;
  ruleId: string;
  impact: string | null;
  standard?: string | null;
  description?: string | null;
  pageUrl?: string | null;
}

export interface PrioritizedViolation extends PriorityInput {
  priorityScore: number;
  estimatedFixHours: number;
  scoreExplanation: string;
}

const IMPACT_SCORE: Record<string, number> = {
  critical: 1,
  serious: 0.7,
  moderate: 0.4,
  minor: 0.15,
};

const FIX_HOURS: Record<string, number> = {
  critical: 2,
  serious: 1.5,
  moderate: 1,
  minor: 0.5,
};

/** Rules that block assistive tech rank higher on AT coverage and are cheaper to fix. */
const AT_RULES = new Set([
  'image-alt',
  'button-name',
  'label',
  'input-image-alt',
  'link-name',
  'frame-title',
  'html-has-lang',
  'IS-011',
]);

function impactKey(impact: string | null | undefined): string {
  const key = (impact ?? 'minor').toLowerCase();
  return key in IMPACT_SCORE ? key : 'minor';
}

function regulatoryScore(standard: string | null | undefined, ruleId: string): number {
  const value = `${standard ?? ''} ${ruleId}`.toUpperCase();
  if (value.includes('IS17802') || value.includes('IS-')) return 1;
  if (value.includes('SEBI')) return 0.9;
  if (value.includes('GIGW')) return 0.8;
  return 0.4;
}

function atCoverageScore(ruleId: string): number {
  return AT_RULES.has(ruleId) ? 1 : 0.35;
}

function easeScore(impact: string): number {
  const hours = FIX_HOURS[impact] ?? 1;
  return Math.max(0, 1 - hours / 4);
}

/**
 * Score one violation. `weights` null uses the product defaults.
 */
export function scoreViolation(
  row: PriorityInput,
  weights: PriorityWeights | null = null,
): PrioritizedViolation {
  const applied = weights ?? DEFAULT_PRIORITY_WEIGHTS;
  const impact = impactKey(row.impact);
  const user = IMPACT_SCORE[impact] ?? 0.15;
  const regulatory = regulatoryScore(row.standard, row.ruleId);
  const atCoverage = atCoverageScore(row.ruleId);
  const ease = easeScore(impact);
  const raw =
    applied.userImpact * user +
    applied.regulatoryWeight * regulatory +
    applied.atCoverage * atCoverage +
    applied.inverseFixComplexity * ease;
  const priorityScore = Math.round(Math.min(1, Math.max(0, raw)) * 100);
  const estimatedFixHours = FIX_HOURS[impact] ?? 1;

  return {
    ...row,
    priorityScore,
    estimatedFixHours,
    scoreExplanation: `${impact} impact, ${row.standard ?? 'WCAG'} — score ${priorityScore}, about ${estimatedFixHours}h to fix`,
  };
}

/**
 * Rank violations and pick a sprint that stays inside `sprintHours`.
 */
export function prioritizeViolations(
  rows: PriorityInput[],
  weights: PriorityWeights | null = null,
  sprintHours = 16,
): {
  violations: PrioritizedViolation[];
  sprintRecommendation: PrioritizedViolation[];
  totalHours: number;
} {
  const violations = rows
    .map((row) => scoreViolation(row, weights))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.estimatedFixHours - b.estimatedFixHours);

  const sprintRecommendation: PrioritizedViolation[] = [];
  let totalHours = 0;
  for (const violation of violations) {
    if (totalHours + violation.estimatedFixHours > sprintHours) continue;
    sprintRecommendation.push(violation);
    totalHours += violation.estimatedFixHours;
  }

  return { violations, sprintRecommendation, totalHours };
}
