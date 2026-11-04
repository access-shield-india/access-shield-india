/**
 * Default issue-priority weights. Each value is 0–1.
 * Equal weights until an organisation saves its own row.
 */
export const DEFAULT_PRIORITY_WEIGHTS = {
  userImpact: 0.25,
  regulatoryWeight: 0.25,
  atCoverage: 0.25,
  inverseFixComplexity: 0.25,
};
