import type { ProblemDetails } from '@accessshield/types';
import type { Response } from 'express';

const PROBLEM_BASE = 'https://api.accessshield.in/problems';

export function sendProblem(
  res: Response,
  status: number,
  type: string,
  title: string,
  detail?: string,
  extra?: Record<string, unknown>,
): void {
  const body: ProblemDetails = {
    type: `${PROBLEM_BASE}/${type}`,
    title,
    status,
    detail,
    instance: res.req?.originalUrl,
    timestamp: new Date().toISOString(),
    requestId: res.req?.id as string | undefined,
    ...extra,
  };

  res.status(status).type('application/problem+json').json(body);
}
