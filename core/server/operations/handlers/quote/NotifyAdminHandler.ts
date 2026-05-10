/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Handler: Notifies the admin of a new B2B quote request (template
 * admin_new_lead). Destinataires lus depuis cs_email_template.recipient_to
 * (CSV multi-emails) with fallback env ADMIN_NOTIF_EMAIL.
 *
 * Must be subscribed AFTER SaveToDatabaseHandler — the quote reference (Q-{id})
 * est lue depuis `event._quoteRequestId`.
 */

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
