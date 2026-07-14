/** Plan-based resource limits for billing / usage endpoints */

/**
 * Monthly subscription prices in paise — keep in sync with
 * apps/web/src/lib/pricing/catalog.ts
 */
export const SUBSCRIPTION_PLAN_PRICES_PAISE: Record<string, { monthly: number; annual: number }> = {
  widget: { monthly: 99900, annual: 999000 },
  starter: { monthly: 0, annual: 0 },
  professional: { monthly: 199900, annual: 1999900 },
  /** @deprecated Legacy — existing customers only; new sales use compliance_shield */
  government: { monthly: 499900, annual: 4999900 },
  compliance_shield: { monthly: 499900, annual: 4999000 },
  regulatory_defense: { monthly: 799900, annual: 7999000 },
  enterprise: { monthly: 1299900, annual: 12999000 },
};

export const PLAN_ASSET_LIMITS: Record<string, number | null> = {
  trial: 1,
  starter: 1,
  widget: 1,
  professional: 1,
  government: 5,
  compliance_shield: 1,
  regulatory_defense: 1,
  enterprise: null,
};

export const PLAN_SCAN_LIMITS: Record<string, number | null> = {
  trial: 1,
  starter: 1,
  widget: 0,
  professional: 20,
  government: null,
  compliance_shield: null,
  regulatory_defense: null,
  enterprise: null,
};

export interface PlanFeatures {
  aiRemediation: boolean;
  sebiReport: boolean;
  widgetSdk: boolean;
  documentScanning: boolean;
  /** 0 = unlimited */
  documentScansPerMonth: number;
}

const STARTER_PLAN_FEATURES: PlanFeatures = {
  aiRemediation: false,
  sebiReport: false,
  widgetSdk: false,
  documentScanning: true,
  documentScansPerMonth: 10,
};

/** Feature flags by plan — enforced in middleware / UI where applicable */
export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  trial: {
    aiRemediation: false,
    sebiReport: false,
    widgetSdk: false,
    documentScanning: false,
    documentScansPerMonth: 0,
  },
  starter: STARTER_PLAN_FEATURES,
  widget: {
    aiRemediation: false,
    sebiReport: false,
    widgetSdk: true,
    documentScanning: false,
    documentScansPerMonth: 0,
  },
  professional: {
    aiRemediation: true,
    sebiReport: false,
    widgetSdk: true,
    documentScanning: true,
    documentScansPerMonth: 100,
  },
  government: {
    aiRemediation: true,
    sebiReport: true,
    widgetSdk: false,
    documentScanning: true,
    documentScansPerMonth: 0,
  },
  compliance_shield: {
    aiRemediation: true,
    sebiReport: false,
    widgetSdk: true,
    documentScanning: true,
    documentScansPerMonth: 0,
  },
  regulatory_defense: {
    aiRemediation: true,
    sebiReport: true,
    widgetSdk: true,
    documentScanning: true,
    documentScansPerMonth: 0,
  },
  enterprise: {
    aiRemediation: true,
    sebiReport: true,
    widgetSdk: true,
    documentScanning: true,
    documentScansPerMonth: 0,
  },
};

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
  return PLAN_ASSET_LIMITS[planTier] ?? PLAN_ASSET_LIMITS.starter ?? 1;
}

export function getScanLimit(planTier: string): number | null {
  return PLAN_SCAN_LIMITS[planTier] ?? PLAN_SCAN_LIMITS.starter ?? 1;
}

export function getPlanFeatures(planTier: string): PlanFeatures {
  return PLAN_FEATURES[planTier] ?? STARTER_PLAN_FEATURES;
}
