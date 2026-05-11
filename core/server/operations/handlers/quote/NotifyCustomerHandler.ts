

import type { DomainEvent } from '../../bus/EventBus'
import type { QuoteRequestedPayload } from '../../events/QuoteRequestedEvent'
import { sendQuoteRequestEmail } from '~/server/utils/order-emails'
import { signQuotePdfToken } from '~/server/api/quote/[id]/pdf.get'
import { signQuoteRdvToken } from '~/server/utils/quote-rdv-token'
import { t, tFormat } from '~/server/utils/i18n'
import { usePocPg } from '~/server/db/drizzle-pg'
import { sql } from 'drizzle-orm'

const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

async function loadCatalogPrices(itemIds: number[]): Promise<Map<number, number>> {
  const map = new Map<number, number>()
  
  
  
  
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

    
    
    const validUntil = new Date(Date.now() + 30 * 24 * 3600 * 1000)
      .toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

    
    
    
    
    const idLang = 1
    const prices = await loadCatalogPrices(payload.items.map(i => i.id))
    const { html: itemsHtml, totalHt } = await buildItemsHtml(payload.items, prices, idLang)
    const totalLabel = totalHt > 0
      ? tFormat(
          await t('quote_email_total_with_disclaimer', idLang, '{total} HT (tarif catalogue, hors remise commerciale)'),
          { total: formatPrice(totalHt) },
        )
      : await t('quote_email_total_pending', idLang, 'Sur devis — proposition tarifaire à venir')

    
    
    
    const FALLBACK_DOMAIN = 'example-shop-nuxt.codemyshop.com'
    const domain = shopDomain || FALLBACK_DOMAIN

    
    let quotePdfUrl = ''
    if (idQuoteRequest) {
      const token = signQuotePdfToken(idQuoteRequest)
      quotePdfUrl = `https://${domain}/api/quote/${idQuoteRequest}/pdf?token=${token}`
    }

    
    
    
    
    
    
    let rdvUrl = `https://${domain}/rdv`
    if (idQuoteRequest) {
      const rdvToken = signQuoteRdvToken(idQuoteRequest)
      rdvUrl += `?quote=${idQuoteRequest}&t=${rdvToken}`
    }

    
    
    
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
