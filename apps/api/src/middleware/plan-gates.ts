/**
 * Feature gates by organisation planTier (India revenue ladder).
 */

import type { Database } from '@accessshield/db';
import { organisations } from '@accessshield/db';
import { eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import {
  getPlanFeatures,
  isJourneysAllowed,
  isPostureAnalyticsPolicyAllowed,
  isSebiReportAllowed,
} from '../lib/plan-limits';
import { sendProblem } from '../lib/problem-details';

async function loadPlanTier(db: Database, orgId: string): Promise<string> {
  const [org] = await db
    .select({ planTier: organisations.planTier })
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1);
  return org?.planTier ?? 'developer';
}

export function requireWidgetPlan(db: Database) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user?.org_id;
      if (!orgId) {
        sendProblem(res, 401, 'unauthenticated', 'Authentication required');
        return;
      }
      const planTier = await loadPlanTier(db, orgId);
      if (!getPlanFeatures(planTier).widgetSdk) {
        sendProblem(
          res,
          403,
          'plan-upgrade-required',
          'Accessibility widget requires Professional or Enterprise. Upgrade to unlock.',
          undefined,
          { requiredPlan: 'professional', feature: 'widget' },
        );
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireJourneysPlan(db: Database) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user?.org_id;
      if (!orgId) {
        sendProblem(res, 401, 'unauthenticated', 'Authentication required');
        return;
      }
      const planTier = await loadPlanTier(db, orgId);
      if (!isJourneysAllowed(planTier)) {
        sendProblem(
          res,
          403,
          'plan-upgrade-required',
          'Dynamic journeys require Professional or Enterprise.',
          undefined,
          { requiredPlan: 'professional', feature: 'journeys' },
        );
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requirePosturePlan(db: Database) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user?.org_id;
      if (!orgId) {
        sendProblem(res, 401, 'unauthenticated', 'Authentication required');
        return;
      }
      const planTier = await loadPlanTier(db, orgId);
      if (!isPostureAnalyticsPolicyAllowed(planTier)) {
        sendProblem(
          res,
          403,
          'plan-upgrade-required',
          'Posture, Analytics, and Policy require Enterprise.',
          undefined,
          { requiredPlan: 'enterprise', feature: 'posture' },
        );
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireSebiPlan(db: Database) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user?.org_id;
      if (!orgId) {
        sendProblem(res, 401, 'unauthenticated', 'Authentication required');
        return;
      }
      const planTier = await loadPlanTier(db, orgId);
      if (!isSebiReportAllowed(planTier)) {
        sendProblem(
          res,
          403,
          'plan-upgrade-required',
          'SEBI evidence packs require Enterprise.',
          undefined,
          { requiredPlan: 'enterprise', feature: 'sebi' },
        );
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
