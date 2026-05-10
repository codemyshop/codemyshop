/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { randomUUID } from 'node:crypto'
import type { DomainEvent } from '../bus/EventBus'

// ── Typed payload ─────────────────────────────────────────────────────────

export interface QuoteItem {
  id: number
  name: string
  reference?: string
  quantity: number
}

export interface QuoteRequestedPayload {
  firstname: string
  lastname: string
  email: string
  phone: string
  company: string
  siret: string
  activite: string
  message: string
  items: QuoteItem[]
  totalItems: number
  /** INSEE enrichment (populated if the company-search API responds). */
  enrichment?: {
    legalName?:   string
    nafCode?:     string
    nafLabel?:    string
    postalCode?:  string
    cityInsee?:   string
    addressInsee?: string
    staffSize?:   string
  }
}

// ── Nom canonique ──────────────────────────────────────────────────────────

export const QUOTE_REQUESTED = 'quote.requested' as const

// ── Factory ────────────────────────────────────────────────────────────────

export function createQuoteRequestedEvent(
  payload: QuoteRequestedPayload,
): DomainEvent<QuoteRequestedPayload> {
  return {
    id: randomUUID(),
    name: QUOTE_REQUESTED,
    timestamp: new Date().toISOString(),
    payload,
  }
}
