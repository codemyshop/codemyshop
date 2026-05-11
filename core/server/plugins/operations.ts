

import { eventBus } from '~/server/operations/bus/EventBus'
import { QUOTE_REQUESTED } from '~/server/operations/events/QuoteRequestedEvent'
import { SaveToDatabaseHandler } from '~/server/operations/handlers/quote/SaveToDatabaseHandler'
import { PushToCrmHandler } from '~/server/operations/handlers/quote/PushToCrmHandler'
import { NotifyCustomerHandler } from '~/server/operations/handlers/quote/NotifyCustomerHandler'
import { NotifyAdminHandler } from '~/server/operations/handlers/quote/NotifyAdminHandler'

export default defineNitroPlugin(() => {
  
  eventBus.subscribe(QUOTE_REQUESTED, SaveToDatabaseHandler)
  eventBus.subscribe(QUOTE_REQUESTED, PushToCrmHandler)
  eventBus.subscribe(QUOTE_REQUESTED, NotifyCustomerHandler)
  eventBus.subscribe(QUOTE_REQUESTED, NotifyAdminHandler)

  console.log(`[Operations] Business OS ready — ${eventBus.listenerCount(QUOTE_REQUESTED)} handlers for '${QUOTE_REQUESTED}'`)
})
