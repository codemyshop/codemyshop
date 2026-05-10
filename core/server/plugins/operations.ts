/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Nitro Plugin — Instantiates the EventBus and attaches handlers at boot.
 *
 * The EventBus is exposed on globalThis for access from any module.
 * Handlers are registered in execution order:
 * 1) SaveToDatabase (local persistence — always, injects _quoteRequestId)
 * 2) PushToCrm (CRM — silent if down)
 * 3) NotifyCustomer (visitor email acknowledgment — reads _quoteRequestId for the reference)
 */

import { eventBus } from '~/server/operations/bus/EventBus'
import { QUOTE_REQUESTED } from '~/server/operations/events/QuoteRequestedEvent'
import { SaveToDatabaseHandler } from '~/server/operations/handlers/quote/SaveToDatabaseHandler'
import { PushToCrmHandler } from '~/server/operations/handlers/quote/PushToCrmHandler'
import { NotifyCustomerHandler } from '~/server/operations/handlers/quote/NotifyCustomerHandler'
import { NotifyAdminHandler } from '~/server/operations/handlers/quote/NotifyAdminHandler'

export default defineNitroPlugin(() => {
  // ── Quote Requested ──────────────────────────────────────────────────
  eventBus.subscribe(QUOTE_REQUESTED, SaveToDatabaseHandler)
  eventBus.subscribe(QUOTE_REQUESTED, PushToCrmHandler)
  eventBus.subscribe(QUOTE_REQUESTED, NotifyCustomerHandler)
  eventBus.subscribe(QUOTE_REQUESTED, NotifyAdminHandler)

  console.log(`[Operations] Business OS ready — ${eventBus.listenerCount(QUOTE_REQUESTED)} handlers for '${QUOTE_REQUESTED}'`)
})
