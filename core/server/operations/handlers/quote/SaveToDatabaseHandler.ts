

import type { DomainEvent } from '../../bus/EventBus'
import type { QuoteRequestedPayload } from '../../events/QuoteRequestedEvent'
import { createQuoteRequestWithItems } from '~/modules/quote-request/server/utils/quote-request'
import { verifySiret } from '~/server/utils/siret-verify'
import { usePocPg } from '~/server/db/drizzle-pg'
import { sql } from 'drizzle-orm'

export async function SaveToDatabaseHandler(event: DomainEvent<QuoteRequestedPayload>): Promise<void> {
  try {
    const { payload } = event

    
    
    const idQuoteRequest = await createQuoteRequestWithItems(
      {
        firstname: payload.firstname,
        lastname: payload.lastname,
        email: payload.email,
        phone: payload.phone,
        company: payload.company,
        siret: payload.siret,
        activite: payload.activite,
        message: payload.message,
        totalItems: payload.totalItems,
      },
      (payload.items || []).map((item) => ({
        idProduct: item.id,
        name: item.name,
        reference: item.reference ?? null,
        quantity: item.quantity,
      })),
    )

    ;(event as any)._quoteRequestId = idQuoteRequest

    console.log(`[SaveToDatabase] QuoteRequest #${idQuoteRequest} saved (${(payload.items || []).length} items)`)

    
    
    
    
    if (payload.siret) {
      try {
        const sirenInfo = await verifySiret(payload.siret)
        if (sirenInfo?.valid) {
          await usePocPg().execute(sql`
            UPDATE cs_main.cs_quote_request
               SET legal_name    = ${sirenInfo.companyName    ?? ''},
                   naf_code      = ${sirenInfo.nafCode        ?? ''},
                   naf_label     = ${sirenInfo.nafLabel       ?? ''},
                   postal_code   = ${sirenInfo.postalCode     ?? ''},
                   city_insee    = ${sirenInfo.city           ?? ''},
                   address_insee = ${sirenInfo.address        ?? ''},
                   staff_size    = ${sirenInfo.staffSize      ?? ''},
                   date_upd      = NOW()
             WHERE id_quote_request = ${idQuoteRequest}
          `)
          
          
          payload.enrichment = {
            legalName:    sirenInfo.companyName,
            nafCode:      sirenInfo.nafCode,
            nafLabel:     sirenInfo.nafLabel,
            postalCode:   sirenInfo.postalCode,
            cityInsee:    sirenInfo.city,
            addressInsee: sirenInfo.address,
            staffSize:    sirenInfo.staffSize,
          }
          console.log(`[SaveToDatabase] QuoteRequest #${idQuoteRequest} enriched INSEE (${sirenInfo.nafCode || 'no-naf'})`)
        }
      } catch (err: any) {
        console.warn(`[SaveToDatabase] enrichment SIRET KO:`, err?.message)
      }
    }
  } catch (err: any) {
    console.error('[SaveToDatabase] DB write failed:', err?.message || err)
  }
}
