/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/orders/:id/invoice — Downloads the PDF invoice of an order.
 * Direct PostgreSQL DB (Zero PrestaShop webservice policy 2026-04-22).
 */
import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { resolveClientId } from '~/server/utils/db'
import { getOrderFromDb } from '~/server/utils/orders-db'
import { generateInvoicePdf } from '~/server/utils/invoice-pdf'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const { clientId } = getQuery(event) as { clientId?: string }
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  const order = await getOrderFromDb(id, ctx)
  if (!order) throw createError({ statusCode: 404, message: 'Commande introuvable' })
  if (!order.invoiceNumber) throw createError({ statusCode: 404, message: 'Aucune facture disponible pour cette commande' })

  const d = usePocPg()
  const shopRows: any[] = await d.execute(sql`SELECT value FROM cs_main.ps_configuration WHERE name = 'PS_SHOP_NAME' LIMIT 1`) as any[]
  const shopName = shopRows?.[0]?.value || 'Boutique'

  const resolvedClientId = clientId ? String(clientId) : resolveClientId(event)
  const { getThemePrimaryColor } = await import('~/modules/theme/server/utils/theme')
  const accentColor = (await getThemePrimaryColor({ clientId: resolvedClientId }).catch(() => null)) || '#4F46E5'
  const pdf = await generateInvoicePdf(order, shopName, accentColor)

  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="facture-${order.invoiceNumber}-${order.reference}.pdf"`,
    'Content-Length': String(pdf.length),
  })
  return pdf
})
