import type { UserRole } from '@accessshield/types';
import type { NextFunction, Request, Response } from 'express';
import { sendProblem } from '../lib/problem-details';

/** Role hierarchy — higher index = more privilege */
const ROLE_HIERARCHY: readonly UserRole[] = [
  'auditor',
  'developer',
  'accessibility_officer',
  'customer_admin',
  'super_admin',
] as const;

function roleLevel(role: UserRole): number {
  return ROLE_HIERARCHY.indexOf(role);
}

/**
 * RBAC middleware factory.
 * Each route must declare required roles via `requireRoles(...)`.
 *
 * @example
 * router.get('/scans', requireRoles('developer', 'accessibility_officer'), listScans);
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return function rbacMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      sendProblem(res, 401, 'unauthorized', 'Authentication required');
      return;
    }

    const userRole = req.user.user_role;

    if (userRole === 'super_admin') {
      next();
      return;
    }

    const hasRole = allowedRoles.some(
      (allowed) => userRole === allowed || roleLevel(userRole) >= roleLevel(allowed),
    );

    if (!hasRole) {
      sendProblem(
        res,
        403,
        'forbidden',
        'Insufficient permissions',
        `Role '${userRole}' is not authorised for this resource`,
        { requiredRoles: allowedRoles },
      );
      return;
    }

    next();
  };
}

/** Tenant isolation — ensures resource belongs to user's organisation */
export function requireSameOrg(getOrgId: (req: Request) => string | undefined) {
  return function orgMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      sendProblem(res, 401, 'unauthorized', 'Authentication required');
      return;
    }

    const resourceOrgId = getOrgId(req);

    if (
      resourceOrgId &&
      resourceOrgId !== req.user.org_id &&
      req.user.user_role !== 'super_admin'
    ) {
      sendProblem(res, 403, 'forbidden', 'Cross-tenant access denied');
      return;
    }

    next();
  };
}
