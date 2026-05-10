/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import archiver from 'archiver'
import { PassThrough } from 'node:stream'
import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { resolveClientId } from '~/server/utils/db'
import { getOrdersForCustomer } from '~/server/utils/orders-db'
import { generateInvoicePdf } from '~/server/utils/invoice-pdf'

/**
 * GET /api/orders/invoices?clientId=xxx&ids=1,2,3 — Downloads a ZIP of PDF invoices
 * If ids is empty/absent, downloads all invoices for the connected customer.
 */
export default defineEventHandler(async (event) => {
  const { clientId, customerId, ids } = getQuery(event) as {
    clientId?: string
    customerId?: string
    ids?: string
  }

  if (!customerId) throw createError({ statusCode: 400, message: 'customerId requis' })

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  const allOrders = await getOrdersForCustomer(Number(customerId), 100, ctx)

  // Filtrer : seulement les commandes avec facture
  let orders = allOrders.filter(o => o.invoiceNumber)

  // Si des IDs spécifiques sont demandés, filtrer davantage
  if (ids) {
    const idSet = new Set(ids.split(',').map(Number))
    orders = orders.filter(o => idSet.has(o.id))
  }

  if (!orders.length) throw createError({ statusCode: 404, message: 'Aucune facture disponible' })

  // Résoudre le nom de boutique depuis la DB PG (cs_main)
  const d = usePocPg()
  const shopRows: any[] = await d.execute(sql`SELECT value FROM cs_main.ps_configuration WHERE name = 'PS_SHOP_NAME' LIMIT 1`) as any[]
  const shopName = shopRows?.[0]?.value || 'Boutique'

  const resolvedClientId = clientId ? String(clientId) : resolveClientId(event)
  const { getThemePrimaryColor } = await import('~/modules/theme/server/utils/theme')
  const accentColor = (await getThemePrimaryColor({ clientId: resolvedClientId }).catch(() => null)) || '#4F46E5'

  // Créer le ZIP
  const archive = archiver('zip', { zlib: { level: 5 } })
  const passthrough = new PassThrough()
  archive.pipe(passthrough)

  for (const order of orders) {
    const pdf = await generateInvoicePdf(order, shopName, accentColor)
    archive.append(pdf, { name: `facture-${order.invoiceNumber}-${order.reference}.pdf` })
  }

  await archive.finalize()

  // Collecter le stream en buffer
  const chunks: Buffer[] = []
  for await (const chunk of passthrough) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const zipBuffer = Buffer.concat(chunks)

  setResponseHeaders(event, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="factures-${clientId || 'export'}.zip"`,
    'Content-Length': String(zipBuffer.length),
  })

  return zipBuffer
})
