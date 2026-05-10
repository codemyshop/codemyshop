/**
 *
 * Subscription Facade — recurring B2B subscriptions. Source of truth:
 * `cs_subscription`, owned by ac_subscription. Tenant-aware.
 */

import * as pg from './subscription-pg'

export type SubscriptionCycle = 'monthly' | 'quarterly' | 'yearly'
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'ended'

export interface SubscriptionItem {
  id: number
  idInvoiceClient: number
  label: string
  description: string | null
  cycle: SubscriptionCycle
  autoInvoiceDay: number
  executionOffsetMonths: number
  amountHt: number
  vatRate: number
  currency: string
  startDate: Date
  endDate: Date | null
  status: SubscriptionStatus
  lastInvoicedAt: Date | null
  quoteId: number | null
}

interface SubscriptionContext { event?: any; clientId?: string }

export async function listSubscriptionsForClient(
  idInvoiceClient: number,
  status: SubscriptionStatus | null = null,
  _ctx: SubscriptionContext = {},
): Promise<SubscriptionItem[]> {
  return pg.listSubscriptionsForClientPg(idInvoiceClient, status) as any
}

/**
 * Lists active subscriptions to invoice today (auto_invoice_day = day
 * of current month). Used by recurring billing cron job.
 */
export async function listSubscriptionsDueToday(
  todayDayOfMonth: number,
  _ctx: SubscriptionContext = {},
): Promise<SubscriptionItem[]> {
  return pg.listSubscriptionsDueTodayPg(todayDayOfMonth) as any
}

export async function updateSubscriptionStatus(
  idSubscription: number,
  status: SubscriptionStatus,
  _ctx: SubscriptionContext = {},
): Promise<void> {
  return pg.updateSubscriptionStatusPg(idSubscription, status)
}

export async function markSubscriptionInvoiced(
  idSubscription: number,
  invoicedAt: Date | string,
  _ctx: SubscriptionContext = {},
): Promise<void> {
  return pg.markSubscriptionInvoicedPg(idSubscription, invoicedAt)
}
