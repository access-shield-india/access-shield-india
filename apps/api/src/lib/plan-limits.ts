/** Plan-based resource limits — keep in sync with apps/web/src/lib/pricing/catalog.ts */

/**
 * Monthly subscription prices in paise.
 * Legacy tiers kept for existing customers; new sales use developer / professional / enterprise.
 */
export const SUBSCRIPTION_PLAN_PRICES_PAISE: Record<
  string,
  { monthly: number; annual: number } | null
> = {
  free: { monthly: 0, annual: 0 },
  trial: { monthly: 0, annual: 0 },
  /** @deprecated alias → developer */
  starter: { monthly: 149900, annual: 1499000 },
  developer: { monthly: 149900, annual: 1499000 },
  professional: { monthly: 799900, annual: 7999000 },
  enterprise: null,
  government: null,
  /** @deprecated */
  widget: { monthly: 149900, annual: 1499000 },
  widget_addon: { monthly: 149900, annual: 1499000 },
  /** @deprecated → professional / enterprise */
  compliance_shield: { monthly: 799900, annual: 7999000 },
  regulatory_defense: null,
};

export const PLAN_ASSET_LIMITS: Record<string, number | null> = {
  free: 1,
  trial: 1,
  starter: 1,
  developer: 1,
  widget: 1,
  widget_addon: 1,
  professional: 10,
  compliance_shield: 10,
  government: null,
  regulatory_defense: null,
  enterprise: null,
};

export const PLAN_SCAN_LIMITS: Record<string, number | null> = {
  free: 1,
  trial: 1,
  starter: 10,
  developer: 10,
  widget: 0,
  widget_addon: 0,
  professional: null,
  compliance_shield: null,
  government: null,
  regulatory_defense: null,
  enterprise: null,
};

export interface PlanFeatures {
  aiRemediation: boolean;
  /** Cap AI enrichments per scan when aiRemediation is true; 0 = unlimited */
  aiRemediationLimit: number;
  sebiReport: boolean;
  widgetSdk: boolean;
  documentScanning: boolean;
  /** 0 = unlimited */
  documentScansPerMonth: number;
  journeys: boolean;
  postureAnalyticsPolicy: boolean;
}

const FREE_FEATURES: PlanFeatures = {
  aiRemediation: false,
  aiRemediationLimit: 0,
  sebiReport: false,
  widgetSdk: false,
  documentScanning: false,
  documentScansPerMonth: 0,
  journeys: false,
  postureAnalyticsPolicy: false,
};

const DEVELOPER_FEATURES: PlanFeatures = {
  aiRemediation: true,
  aiRemediationLimit: 20,
  sebiReport: false,
  widgetSdk: false,
  documentScanning: true,
  documentScansPerMonth: 25,
  journeys: false,
  postureAnalyticsPolicy: false,
};

const PROFESSIONAL_FEATURES: PlanFeatures = {
  aiRemediation: true,
  aiRemediationLimit: 0,
  sebiReport: false,
  widgetSdk: true,
  documentScanning: true,
  documentScansPerMonth: 0,
  journeys: true,
  postureAnalyticsPolicy: false,
};

const ENTERPRISE_FEATURES: PlanFeatures = {
  aiRemediation: true,
  aiRemediationLimit: 0,
  sebiReport: true,
  widgetSdk: true,
  documentScanning: true,
  documentScansPerMonth: 0,
  journeys: true,
  postureAnalyticsPolicy: true,
};

/** Feature flags by plan — enforced in middleware / UI where applicable */
export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  free: FREE_FEATURES,
  trial: FREE_FEATURES,
  starter: DEVELOPER_FEATURES,
  developer: DEVELOPER_FEATURES,
  widget: {
    ...FREE_FEATURES,
    widgetSdk: true,
  },
  widget_addon: {
    ...FREE_FEATURES,
    widgetSdk: true,
  },
  professional: PROFESSIONAL_FEATURES,
  compliance_shield: PROFESSIONAL_FEATURES,
  government: ENTERPRISE_FEATURES,
  regulatory_defense: ENTERPRISE_FEATURES,
  enterprise: ENTERPRISE_FEATURES,
};

/** Normalise legacy tier names to the India revenue ladder. */
export function normalizePlanTier(planTier: string): string {
  switch (planTier) {
    case 'starter':
      return 'developer';
    case 'compliance_shield':
      return 'professional';
    case 'regulatory_defense':
    case 'government':
      return 'enterprise';
    case 'widget':
      return 'widget_addon';
    default:
      return planTier;
  }
}

export function isScanLimitDisabled(): boolean {
  if (process.env.SCAN_LIMIT_DISABLED === 'true') {
    return true;
  }
  return process.env.NODE_ENV !== 'production';
}

/** Dev bypass for asset count limits — same flag as scan limits. */
export function isAssetLimitDisabled(): boolean {
  return isScanLimitDisabled();
}

export function getAssetLimit(planTier: string): number | null {
  const key = normalizePlanTier(planTier);
  return PLAN_ASSET_LIMITS[key] ?? PLAN_ASSET_LIMITS.developer ?? 1;
}

export function getScanLimit(planTier: string): number | null {
  const key = normalizePlanTier(planTier);
  return PLAN_SCAN_LIMITS[key] ?? PLAN_SCAN_LIMITS.developer ?? 10;
}

export function getPlanFeatures(planTier: string): PlanFeatures {
  const key = normalizePlanTier(planTier);
  return PLAN_FEATURES[key] ?? DEVELOPER_FEATURES;
}

/** SEBI PDF reports — Enterprise ladder, or any plan in local dev. */
export function isSebiReportAllowed(planTier: string): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  return getPlanFeatures(planTier).sebiReport;
}

export function isJourneysAllowed(planTier: string): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  return getPlanFeatures(planTier).journeys;
}

export function isPostureAnalyticsPolicyAllowed(planTier: string): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  return getPlanFeatures(planTier).postureAnalyticsPolicy;
}

export const CHECKOUT_PLAN_IDS = ['developer', 'professional'] as const;
export type CheckoutPlanId = (typeof CHECKOUT_PLAN_IDS)[number];

export function getCheckoutPricePaise(
  planId: string,
  period: 'monthly' | 'annual',
): number | null {
  const prices = SUBSCRIPTION_PLAN_PRICES_PAISE[planId];
  if (!prices) return null;
  return period === 'monthly' ? prices.monthly : prices.annual;
}
