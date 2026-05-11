

import type { DomainEvent } from '../../bus/EventBus'
import type { QuoteRequestedPayload } from '../../events/QuoteRequestedEvent'
import { crmCreateLeadProject } from '~/server/utils/crm-direct'
import { linkCrmToQuoteRequest } from '~/modules/quote-request/server/utils/quote-request'

export async function PushToCrmHandler(event: DomainEvent<QuoteRequestedPayload>): Promise<void> {
  try {
    const { payload } = event

    const clientId = process.env.NUXT_CLIENT_ID || process.env.NUXT_PUBLIC_CLIENT_ID || 'ac-hub'

    const crmResult = await crmCreateLeadProject({
      email: payload.email,
      firstname: payload.firstname,
      lastname: payload.lastname,
      phone: payload.phone,
      companyName: payload.company,
      profession: payload.activite,
      referenceClient: payload.siret,
      leadSource: 'demande_devis',
      projectType: 'devis',
      projectIntention: 'achat_grossiste',
      itemsJson: JSON.stringify(payload.items),
      message: payload.message,
    }, { clientId })

    if (crmResult.success && crmResult.leadId && crmResult.projectId) {
      console.log(`[PushToCrm] Lead #${crmResult.leadId} + Project #${crmResult.projectId}`)

      const quoteRequestId = (event as any)._quoteRequestId
      if (quoteRequestId) {
        await linkCrmToQuoteRequest(quoteRequestId, crmResult.leadId, crmResult.projectId, { global: true })
      }
    } else {
      console.error('[PushToCrm] CRM error:', crmResult.error || 'unknown')
    }
  } catch (err: any) {
    console.error('[PushToCrm] CRM direct failed:', err?.message || err)
  }
}
