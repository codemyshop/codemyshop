/**
 *
 * Quote facade — B2B billing quotations (≠ quoterequest which is the
 * prospect form). Sources of truth: `cs_quote` + `cs_quote_line`,
 * owned by the quote module.
 *
 * Thin wrapper that delegates everything to `quote-pg.ts` (100% PostgreSQL runtime
 * depuis chantier #38 phase E.3, 2026-04-30).
 */

import * as pg from './quote-pg'

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'refused' | 'expired'
export type SubscriptionCycle = 'monthly' | 'quarterly' | 'yearly'

export interface QuoteItem {
  id: number
  idInvoiceClient: number
  number: string
  issueDate: Date
  validUntil: Date
  subject: string
  executionPeriod: string | null
  description: string | null
  amountHt: number
  amountVat: number
  amountTtc: number
  vatRate: number
  currency: string
  status: QuoteStatus
  createsSubscription: number
  subscriptionCycle: SubscriptionCycle | null
  subscriptionMonths: number | null
  acceptedAt: Date | null
  refusedAt: Date | null
  pdfPath: string | null
  sentAt: Date | null
  sentTo: string | null
  acceptToken: string | null
}

export interface QuoteLineItem {
  id: number
  idQuote: number
  position: number
  description: string
  quantity: number
  unitPriceHt: number
  vatRate: number
  amountHt: number
}

export async function getQuoteById(idQuote: number): Promise<QuoteItem | null> {
  return pg.getQuoteByIdPg(idQuote) as any
}

export async function getQuoteByNumber(number: string): Promise<QuoteItem | null> {
  return pg.getQuoteByNumberPg(number) as any
}

export async function getQuoteByAcceptToken(token: string): Promise<QuoteItem | null> {
  return pg.getQuoteByAcceptTokenPg(token) as any
}

export async function listQuotesForClient(
  idInvoiceClient: number,
  status: QuoteStatus | null = null,
): Promise<QuoteItem[]> {
  return pg.listQuotesForClientPg(idInvoiceClient, status) as any
}

export async function listQuoteLines(idQuote: number): Promise<QuoteLineItem[]> {
  return pg.listQuoteLinesPg(idQuote) as any
}

export async function updateQuoteStatus(
  idQuote: number,
  status: QuoteStatus,
  options: { acceptedAt?: Date; refusedAt?: Date } = {},
): Promise<void> {
  return pg.updateQuoteStatusPg(idQuote, status, options)
}
