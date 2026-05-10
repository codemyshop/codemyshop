/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Handler: saves the quote request in the local table cs_quote_request
 * + normalizes line items in cs_quote_request_item (ac_quoterequest module).
 *
 * Single responsibility: local persistence (resilience).
 * If the external system is down, the data is still saved here.
 * Single-tenant: uses the default database of the instance.
 */

import type { DomainEvent } from '../../bus/EventBus'
import type { QuoteRequestedPayload } from '../../events/QuoteRequestedEvent'
import { createQuoteRequestWithItems } from '~/modules/quote-request/server/utils/quote-request'
import { verifySiret } from '~/server/utils/siret-verify'
import { usePocPg } from '~/server/db/drizzle-pg'
import { sql } from 'drizzle-orm'

export async function SaveToDatabaseHandler(event: DomainEvent<QuoteRequestedPayload>): Promise<void> {
  try {
    const { payload } = event

    // 1) INSERT immédiat — pas d'enrichment au début, le commercial voit
    //    déjà la fiche dans /hub/quotes même si l'API gouv tarde.
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

    // 2) Enrichissement INSEE déféré (recherche-entreprises.api.gouv.fr).
    //    Sortie du chemin HTTP submit (gain UX 1-3s côté visiteur). Quand
    //    l'API répond, UPDATE la row avec raison sociale, code APE, etc.
    //    Le PDF généré au moment du send queue lit la row enrichie.
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
          // Propage les valeurs au payload pour les handlers suivants
          // (ex: PushToCrm pourrait vouloir l'utiliser).
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
