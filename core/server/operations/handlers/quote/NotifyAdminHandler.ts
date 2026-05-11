

import type { DomainEvent } from '../../bus/EventBus'
import type { QuoteRequestedPayload } from '../../events/QuoteRequestedEvent'
import { sendAdminNewLeadEmail } from '~/server/utils/order-emails'

export async function NotifyAdminHandler(event: DomainEvent<QuoteRequestedPayload>): Promise<void> {
  try {
    const { payload } = event
    const idQuoteRequest = (event as any)._quoteRequestId as number | undefined
    const quoteRef = idQuoteRequest ? `Q-${idQuoteRequest}` : 'Q-pending'

    const result = await sendAdminNewLeadEmail({
      firstname:  payload.firstname,
      lastname:   payload.lastname,
      email:      payload.email,
      phone:      payload.phone,
      company:    payload.company,
      totalItems: payload.totalItems,
      quoteRef,
      message:    payload.message,
    })

    console.log(`[NotifyAdmin] Lead ${quoteRef} → ${result.sentTo.length} admin(s) ${result.ok ? 'OK' : 'KO'}`)
  } catch (err: any) {
    console.error('[NotifyAdmin] Email send failed:', err?.message || err)
  }
}
