/**
 *
 * Subscription Facade (Postgres) — project #38 Phase 1 step 4,
 * flag PG_ENABLED_DOMAINS=subscription.
 */

import { and, asc, eq } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'
import { subscriptionVaisseau } from '../../../../server/db/schema-pg/subscription'

export type SubscriptionCycle = 'monthly' | 'quarterly' | 'yearly'
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'ended'

function mapRow(r: any) {
  return {
    id: Number(r.idSubscription),
    idInvoiceClient: Number(r.idInvoiceClient),
    label: r.label,
    description: r.description,
    cycle: r.cycle as SubscriptionCycle,
    autoInvoiceDay: Number(r.autoInvoiceDay),
    executionOffsetMonths: Number(r.executionOffsetMonths),
    amountHt: Number(r.amountHt),
    vatRate: Number(r.vatRate),
    currency: r.currency,
    startDate: r.startDate,
    endDate: r.endDate,
    status: r.status as SubscriptionStatus,
    lastInvoicedAt: r.lastInvoicedAt,
    quoteId: r.quoteId == null ? null : Number(r.quoteId),
  }
}

export async function listSubscriptionsForClientPg(
  idInvoiceClient: number,
  status: SubscriptionStatus | null = null,
) {
  const conds: any[] = [eq(subscriptionVaisseau.idInvoiceClient, idInvoiceClient)]
  if (status) conds.push(eq(subscriptionVaisseau.status, status))
  const rows = await usePocPg()
    .select()
    .from(subscriptionVaisseau)
    .where(and(...conds))
    .orderBy(asc(subscriptionVaisseau.startDate))
  return rows.map(mapRow)
}

export async function listSubscriptionsDueTodayPg(todayDayOfMonth: number) {
  const rows = await usePocPg()
    .select()
    .from(subscriptionVaisseau)
    .where(
      and(
        eq(subscriptionVaisseau.status, 'active'),
        eq(subscriptionVaisseau.autoInvoiceDay, todayDayOfMonth),
      ),
    )
    .orderBy(asc(subscriptionVaisseau.idSubscription))
  return rows.map(mapRow)
}

/** Write path PG. */
export async function updateSubscriptionStatusPg(
  idSubscription: number,
  status: SubscriptionStatus,
): Promise<void> {
  await usePocPg()
    .update(subscriptionVaisseau)
    .set({ status, dateUpd: new Date() })
    .where(eq(subscriptionVaisseau.idSubscription, idSubscription))
}

/** Write path PG. */
export async function markSubscriptionInvoicedPg(
  idSubscription: number,
  invoicedAt: Date | string,
): Promise<void> {
  const dateStr =
    typeof invoicedAt === 'string' ? invoicedAt : invoicedAt.toISOString().slice(0, 10)
  await usePocPg()
    .update(subscriptionVaisseau)
    .set({ lastInvoicedAt: dateStr, dateUpd: new Date() })
    .where(eq(subscriptionVaisseau.idSubscription, idSubscription))
}
