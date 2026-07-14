import type { UserRole } from '@accessshield/types';
import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { requireRoles } from './rbac';

function mockReqRes(userRole?: UserRole) {
  const req = {
    user: userRole
      ? { sub: '1', email: 'a@b.com', user_role: userRole, org_id: 'org-1' }
      : undefined,
  } as Request;

  const json = vi.fn();
  const type = vi.fn(() => ({ json }));
  const status = vi.fn(() => ({ type, json }));
  const res = { status, json, type } as unknown as Response;
  const next = vi.fn();

  return { req, res, next, status, json, type };
}

describe('requireRoles', () => {
  it('denies unauthenticated requests', () => {
    const { req, res, next, status } = mockReqRes();
    requireRoles('developer')(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows super_admin for any route', () => {
    const { req, res, next } = mockReqRes('super_admin');
    requireRoles('customer_admin')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('denies auditor on developer-only route', () => {
    const { req, res, next, status } = mockReqRes('auditor');
    requireRoles('developer')(req, res, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows accessibility_officer on developer route', () => {
    const { req, res, next } = mockReqRes('accessibility_officer');
    requireRoles('developer')(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
