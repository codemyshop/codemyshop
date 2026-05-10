/**
 *
 * Quote facade (PostgreSQL-backed) — Phase 1 step 4,
 * flag PG_ENABLED_DOMAINS=quote.
 */

import { and, asc, desc, eq } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'
import { quoteVaisseau, quoteLineVaisseau } from '../../../../server/db/schema-pg/quote'

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'refused' | 'expired'
export type SubscriptionCycle = 'monthly' | 'quarterly' | 'yearly'

function mapQuote(r: any) {
  return {
    id: Number(r.idQuote),
    idInvoiceClient: Number(r.idInvoiceClient),
    number: r.number,
    issueDate: r.issueDate,
    validUntil: r.validUntil,
    subject: r.subject,
    executionPeriod: r.executionPeriod,
    description: r.description,
    amountHt: Number(r.amountHt),
    amountVat: Number(r.amountVat),
    amountTtc: Number(r.amountTtc),
    vatRate: Number(r.vatRate),
    currency: r.currency,
    status: r.status as QuoteStatus,
    createsSubscription: Number(r.createsSubscription),
    subscriptionCycle: r.subscriptionCycle as SubscriptionCycle | null,
    subscriptionMonths: r.subscriptionMonths == null ? null : Number(r.subscriptionMonths),
    acceptedAt: r.acceptedAt,
    refusedAt: r.refusedAt,
    pdfPath: r.pdfPath,
    sentAt: r.sentAt,
    sentTo: r.sentTo,
    acceptToken: r.acceptToken,
  }
}

export async function getQuoteByIdPg(idQuote: number) {
  const rows = await usePocPg()
    .select()
    .from(quoteVaisseau)
    .where(eq(quoteVaisseau.idQuote, idQuote))
    .limit(1)
  return rows.length ? mapQuote(rows[0]) : null
}

export async function getQuoteByNumberPg(number: string) {
  const rows = await usePocPg()
    .select()
    .from(quoteVaisseau)
    .where(eq(quoteVaisseau.number, number))
    .limit(1)
  return rows.length ? mapQuote(rows[0]) : null
}

export async function getQuoteByAcceptTokenPg(token: string) {
  const rows = await usePocPg()
    .select()
    .from(quoteVaisseau)
    .where(eq(quoteVaisseau.acceptToken, token))
    .limit(1)
  return rows.length ? mapQuote(rows[0]) : null
}

export async function listQuotesForClientPg(idInvoiceClient: number, status: QuoteStatus | null = null) {
  const conds: any[] = [eq(quoteVaisseau.idInvoiceClient, idInvoiceClient)]
  if (status) conds.push(eq(quoteVaisseau.status, status))
  const rows = await usePocPg()
    .select()
    .from(quoteVaisseau)
    .where(and(...conds))
    .orderBy(desc(quoteVaisseau.issueDate))
  return rows.map(mapQuote)
}

export async function listQuoteLinesPg(idQuote: number) {
  const rows = await usePocPg()
    .select()
    .from(quoteLineVaisseau)
    .where(eq(quoteLineVaisseau.idQuote, idQuote))
    .orderBy(asc(quoteLineVaisseau.position), asc(quoteLineVaisseau.idQuoteLine))
  return rows.map((r) => ({
    id: Number(r.idQuoteLine),
    idQuote: Number(r.idQuote),
    position: Number(r.position),
    description: r.description,
    quantity: Number(r.quantity),
    unitPriceHt: Number(r.unitPriceHt),
    vatRate: Number(r.vatRate),
    amountHt: Number(r.amountHt),
  }))
}

/** Write path PG. */
export async function updateQuoteStatusPg(
  idQuote: number,
  status: QuoteStatus,
  options: { acceptedAt?: Date; refusedAt?: Date } = {},
): Promise<void> {
  const set: Record<string, any> = { status, dateUpd: new Date() }
  if (options.acceptedAt) set.acceptedAt = options.acceptedAt
  if (options.refusedAt) set.refusedAt = options.refusedAt
  await usePocPg().update(quoteVaisseau).set(set).where(eq(quoteVaisseau.idQuote, idQuote))
}
