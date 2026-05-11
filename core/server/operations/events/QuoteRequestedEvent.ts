

import { randomUUID } from 'node:crypto'
import type { DomainEvent } from '../bus/EventBus'

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

export const QUOTE_REQUESTED = 'quote.requested' as const

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
