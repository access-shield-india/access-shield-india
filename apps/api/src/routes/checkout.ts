/**
 * SaaS checkout for Developer / Professional (monthly | annual).
 * Uses Razorpay Orders API when keys are set; otherwise creates a draft invoice
 * and returns a contact / billing portal fallback.
 */

import type { Database } from '@accessshield/db';
import { funnelEvents, invoices, organisations } from '@accessshield/db';
import type { ApiResponse } from '@accessshield/types';
import { eq } from 'drizzle-orm';
import type { NextFunction, Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import {
  CHECKOUT_PLAN_IDS,
  getCheckoutPricePaise,
  type CheckoutPlanId,
} from '../lib/plan-limits';
import { logger } from '../lib/logger';
import { sendProblem } from '../lib/problem-details';
import { requireRoles } from '../middleware/rbac';

const checkoutSchema = z.object({
  planId: z.enum(CHECKOUT_PLAN_IDS),
  period: z.enum(['monthly', 'annual']),
});

function gstSplit(subtotalPaise: number): { gstPaise: number; totalPaise: number } {
  const gstPaise = Math.round(subtotalPaise * 0.18);
  return { gstPaise, totalPaise: subtotalPaise + gstPaise };
}

function periodBounds(period: 'monthly' | 'annual'): { start: string; end: string } {
  const start = new Date();
  const end = new Date(start);
  if (period === 'monthly') {
    end.setUTCMonth(end.getUTCMonth() + 1);
  } else {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string } | null> {
  const keyId = process.env.RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID_TEST;
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? process.env.RAZORPAY_KEY_SECRET_TEST;
  if (!keyId || !keySecret) return null;

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: 'INR',
      receipt: params.receipt.slice(0, 40),
      notes: params.notes,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error({ status: res.status, text }, 'Razorpay order create failed');
    return null;
  }

  const data = (await res.json()) as { id: string; amount: number; currency: string };
  return data;
}

export function createCheckoutRouter(db: Database): ExpressRouter {
  const router = Router();

  router.post(
    '/checkout',
    requireRoles('customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parsed = checkoutSchema.safeParse(req.body);
        if (!parsed.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid checkout request', undefined, {
            errors: parsed.error.flatten().fieldErrors,
          });
          return;
        }

        const { planId, period } = parsed.data;
        const orgId = req.user!.org_id;
        const subtotalPaise = getCheckoutPricePaise(planId, period);
        if (subtotalPaise == null || subtotalPaise <= 0) {
          sendProblem(res, 422, 'unprocessable', 'Plan is not available for self-serve checkout');
          return;
        }

        const { gstPaise, totalPaise } = gstSplit(subtotalPaise);
        const bounds = periodBounds(period);
        const due = new Date();
        due.setUTCDate(due.getUTCDate() + 7);
        const invoiceNumber = `ASI-${new Date().getUTCFullYear()}-${Date.now().toString().slice(-6)}`;

        const [invoice] = await db
          .insert(invoices)
          .values({
            organisationId: orgId,
            invoiceNumber,
            status: 'draft',
            subtotalPaise,
            gstPaise,
            totalPaise,
            currency: 'INR',
            billingPeriodStart: bounds.start,
            billingPeriodEnd: bounds.end,
            dueDate: due.toISOString(),
            lineItems: [
              {
                description: `AccessibleNow ${planId} (${period})`,
                quantity: 1,
                unitPricePaise: subtotalPaise,
                totalPaise: subtotalPaise,
              },
              {
                description: 'GST 18%',
                quantity: 1,
                unitPricePaise: gstPaise,
                totalPaise: gstPaise,
              },
            ],
          })
          .returning();

        await db.insert(funnelEvents).values({
          event: 'checkout_started',
          path: '/dashboard/settings',
          meta: { planId, period, invoiceId: invoice!.id },
          organisationId: orgId,
        });

        const order = await createRazorpayOrder({
          amountPaise: totalPaise,
          receipt: invoiceNumber,
          notes: { orgId, planId, period, invoiceId: invoice!.id },
        });

        const webUrl = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
        const keyId = process.env.RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID_TEST ?? null;

        if (order && keyId) {
          const data = {
            mode: 'razorpay' as const,
            planId: planId as CheckoutPlanId,
            period,
            invoiceId: invoice!.id,
            invoiceNumber,
            amountPaise: totalPaise,
            currency: 'INR',
            razorpayOrderId: order.id,
            razorpayKeyId: keyId,
            automationDisclaimer:
              'Automated scanning alone cannot establish full WCAG / RPwD / IS 17802 / SEBI conformance.',
          };
          const response: ApiResponse<typeof data> = {
            data,
            timestamp: new Date().toISOString(),
          };
          res.status(201).json(response);
          return;
        }

        // No Razorpay keys — draft invoice + sales-assisted path
        logger.info({ orgId, planId, invoiceNumber }, 'Checkout without Razorpay — draft invoice');
        const data = {
          mode: 'invoice_draft' as const,
          planId: planId as CheckoutPlanId,
          period,
          invoiceId: invoice!.id,
          invoiceNumber,
          amountPaise: totalPaise,
          currency: 'INR',
          checkoutUrl: `${webUrl}/contact?plan=${planId}&period=${period}&invoice=${invoiceNumber}`,
          message:
            'Payment gateway not configured. We created a draft invoice — contact sales to complete checkout.',
        };
        const response: ApiResponse<typeof data> = {
          data,
          timestamp: new Date().toISOString(),
        };
        res.status(201).json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  /** Confirm payment and upgrade org plan (webhook-light for MVP). */
  router.post(
    '/checkout/confirm',
    requireRoles('customer_admin'),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const schema = z.object({
          invoiceId: z.string().uuid(),
          planId: z.enum(CHECKOUT_PLAN_IDS),
          razorpayPaymentId: z.string().min(1).optional(),
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
          sendProblem(res, 400, 'validation-error', 'Invalid confirm payload');
          return;
        }

        const orgId = req.user!.org_id;
        const { invoiceId, planId, razorpayPaymentId } = parsed.data;

        const [invoice] = await db
          .select()
          .from(invoices)
          .where(eq(invoices.id, invoiceId))
          .limit(1);

        if (!invoice || invoice.organisationId !== orgId) {
          sendProblem(res, 404, 'not-found', 'Invoice not found');
          return;
        }

        await db
          .update(invoices)
          .set({
            status: 'paid',
            paidAt: new Date().toISOString(),
          })
          .where(eq(invoices.id, invoiceId));

        await db
          .update(organisations)
          .set({ planTier: planId })
          .where(eq(organisations.id, orgId));

        logger.info(
          { orgId, planId, invoiceId, razorpayPaymentId: razorpayPaymentId ? '[set]' : undefined },
          'Checkout confirmed — plan upgraded',
        );

        const response: ApiResponse<{ planTier: string }> = {
          data: { planTier: planId },
          timestamp: new Date().toISOString(),
        };
        res.json(response);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
