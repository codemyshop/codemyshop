/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * Handler: Sends a receipt acknowledgment to the visitor after quote submission.
 *
 * Must be subscribed AFTER SaveToDatabaseHandler — the quote reference (Q-{id})
 * is read from `event._quoteRequestId` injected by SaveToDatabase. If the
 * persistence fails, we fall back to "Request sent" to avoid
 * breaking the chain.
 *
 * Lookup shop_name: ps_configuration.PS_SHOP_NAME (same patterns as
 * register.post.ts). Silent DB error — we keep "Shop" as default.
 */

import type { DomainEvent } from '../../bus/EventBus'
import type { QuoteRequestedPayload } from '../../events/QuoteRequestedEvent'
import { sendQuoteRequestEmail } from '~/server/utils/order-emails'
import { signQuotePdfToken } from '~/server/api/quote/[id]/pdf.get'
import { signQuoteRdvToken } from '~/server/utils/quote-rdv-token'
import { t, tFormat } from '~/server/utils/i18n'
import { usePocPg } from '~/server/db/drizzle-pg'
import { sql } from 'drizzle-orm'

const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

/**
 * Loads catalog prices (ex-tax) from ps_product. Returns a Map id→price.
 * B2B catalog prices (Example Shop is exclusively B2B). Sales staff negotiates
 * discounts from this baseline during the final pricing proposal.
 */
async function loadCatalogPrices(itemIds: number[]): Promise<Map<number, number>> {
  const map = new Map<number, number>()
  // Filtre strict integer pour autoriser le sql.raw IN (...) — zéro risque
  // d'injection (ids déjà validés en amont par Zod). Le pattern ANY(${arr})
  // avec drizzle-orm + postgres-js binde mal les arrays JS dans certains cas
  // → IN (raw csv) est le plus fiable.
  const safeIds = itemIds.filter((n) => Number.isInteger(n) && n > 0)
  if (!safeIds.length) return map
  try {
    const rows = await usePocPg().execute<any>(sql`
      SELECT id_product, price
        FROM cs_main.ps_product
       WHERE id_product IN (${sql.raw(safeIds.join(','))})
    `) as any[]
    for (const r of rows) {
      map.set(Number(r.id_product), Number(r.price))
    }
    console.log(`[NotifyCustomer] loadCatalogPrices: ${map.size}/${safeIds.length} prix trouvés`)
  } catch (err: any) {
    console.warn('[NotifyCustomer] price lookup KO:', err?.message)
  }
  return map
}

/**
 * Builds the HTML block for items to fill the {quote_items_html} placeholder.
 * Shows ex-tax unit price from catalog + subtotal per line + TOTAL ex-tax line.
 * Note disclaimer "catalog pricing — subject to commercial negotiation".
 */
async function buildItemsHtml(items: QuoteRequestedPayload['items'], prices: Map<number, number>, idLang: number): Promise<{ html: string; totalHt: number }> {
  if (!items?.length) return { html: '', totalHt: 0 }
  let totalHt = 0
  const rows = items.map((it) => {
    const unit = prices.get(it.id) ?? 0
    const subtotal = unit * it.quantity
    totalHt += subtotal
    const unitFmt = unit > 0 ? formatPrice(unit) : '—'
    const subFmt  = unit > 0 ? formatPrice(subtotal) : '—'
    return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;">${String(it.name).replace(/[<>]/g, '')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">${it.reference || ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center;color:#475569;">${it.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:#475569;">${unitFmt}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:right;color:#0f172a;font-weight:600;">${subFmt}</td>
    </tr>`
  }).join('')
  // Headers de table + disclaimer i18n via ps_translation (fallback FR
  // si key non seedée). Cf seed /tmp/seed_funnel_i18n.sql.
  const [hProduct, hRef, hQty, hPu, hSub, disclaimer] = await Promise.all([
    t('quote_email_th_product',    idLang, 'Produit'),
    t('quote_email_th_ref',        idLang, 'Réf.'),
    t('quote_email_th_qty',        idLang, 'Qté'),
    t('quote_email_th_unit_price', idLang, 'PU HT'),
    t('quote_email_th_subtotal',   idLang, 'Sous-total HT'),
    t('quote_email_items_disclaimer', idLang, 'Tarif catalogue HT — sujet à négociation commerciale selon volumes et récurrence.'),
  ])
  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:12px 0;">
<thead><tr style="background:#f8fafc;">
<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">${hProduct}</th>
<th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">${hRef}</th>
<th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">${hQty}</th>
<th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">${hPu}</th>
<th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:600;">${hSub}</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
<p style="font-size:11px;color:#94a3b8;margin:8px 0 0;font-style:italic;">${disclaimer}</p>`
  return { html, totalHt }
}

export async function NotifyCustomerHandler(event: DomainEvent<QuoteRequestedPayload>): Promise<void> {
  try {
    const { payload } = event
    const idQuoteRequest = (event as any)._quoteRequestId as number | undefined
    const quoteRef = idQuoteRequest ? `Q-${idQuoteRequest}` : 'Q-pending'

    let shopName = 'Boutique'
    let shopDomain = ''
    try {
      // Schéma explicite cs_main (search_path tenant n'inclut pas
      // ce schéma par défaut côté example_v2_postgres).
      const rows = await usePocPg().execute<any>(sql`
        SELECT name, value FROM cs_main.ps_configuration
         WHERE name IN ('PS_SHOP_NAME','PS_SHOP_DOMAIN')
      `) as any[]
      for (const r of rows) {
        if (r.name === 'PS_SHOP_NAME' && r.value) shopName = String(r.value)
        if (r.name === 'PS_SHOP_DOMAIN' && r.value) shopDomain = String(r.value)
      }
    } catch (err: any) {
      console.warn('[NotifyCustomer] config lookup KO:', err?.message)
    }

    // Vars supplémentaires pour le template cs_email_template_lang
    // (slug=quote_request) : items HTML + total + valid_until + lien PDF signé.
    const validUntil = new Date(Date.now() + 30 * 24 * 3600 * 1000)
      .toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

    // Tarif catalogue HT depuis ps_product (Example Shop 100% B2B). Le commercial
    // applique ses remises sur la proposition tarifaire finale.
    // idLang figé à 1 (FR) pour l'instant — à étendre si payload.email est
    // associé à un customer avec id_lang autre. Fallback FR sinon.
    const idLang = 1
    const prices = await loadCatalogPrices(payload.items.map(i => i.id))
    const { html: itemsHtml, totalHt } = await buildItemsHtml(payload.items, prices, idLang)
    const totalLabel = totalHt > 0
      ? tFormat(
          await t('quote_email_total_with_disclaimer', idLang, '{total} HT (tarif catalogue, hors remise commerciale)'),
          { total: formatPrice(totalHt) },
        )
      : await t('quote_email_total_pending', idLang, 'Sur devis — proposition tarifaire à venir')

    // Fallback hardcodé si PS_SHOP_DOMAIN absent (cas dégénéré, garantit
    // qu'aucun email ne part avec un href="" cassé). Les liens publics
    // restent fonctionnels dans 100% des cas.
    const FALLBACK_DOMAIN = 'example-shop-nuxt.codemyshop.com'
    const domain = shopDomain || FALLBACK_DOMAIN

    // URL signée vers le PDF accusé (re-téléchargement plus tard).
    let quotePdfUrl = ''
    if (idQuoteRequest) {
      const token = signQuotePdfToken(idQuoteRequest)
      quotePdfUrl = `https://${domain}/api/quote/${idQuoteRequest}/pdf?token=${token}`
    }

    // URL /rdv pré-remplie depuis les infos du devis. Format signé court :
    // `?quote=<id>&t=<hmac>` — la page fetch /api/rdv/prefill côté serveur
    // pour récupérer le payload depuis cs_quote_request. On évite ainsi
    // l'ancien format ouvert `?prospectName=…&prospectEmail=…&prospectPhone=…
    // &prospectSiret=…&quoteRef=Q-N` qui se faisait casser par les clients
    // mail (troncature, encodage `&` mal interprété, longueur max URL).
    let rdvUrl = `https://${domain}/rdv`
    if (idQuoteRequest) {
      const rdvToken = signQuoteRdvToken(idQuoteRequest)
      rdvUrl += `?quote=${idQuoteRequest}&t=${rdvToken}`
    }

    // Génération PDF différée : on transmet juste l'id à la queue, le
    // worker generateQuoteRequestPdf au moment du send (~600ms PDFKit
    // sortis du chemin event handler → visiteur HTTP non bloqué).
    await sendQuoteRequestEmail({
      customerEmail: payload.email,
      firstname:     payload.firstname,
      company:       payload.company,
      quoteRef,
      totalItems:    payload.totalItems,
      shopName,
      itemsHtml,
      total:         totalLabel,
      validUntil,
      quotePdfUrl,
      rdvUrl,
      quoteIdForPdf: idQuoteRequest,
    })

    console.log(`[NotifyCustomer] Quote ${quoteRef} ack sent to ${payload.email}`)
  } catch (err: any) {
    console.error('[NotifyCustomer] Email send failed:', err?.message || err)
  }
}
