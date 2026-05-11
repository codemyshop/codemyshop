

import archiver from 'archiver'
import { PassThrough } from 'node:stream'
import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { resolveClientId } from '~/server/utils/db'
import { getOrdersForCustomer } from '~/server/utils/orders-db'
import { generateInvoicePdf } from '~/server/utils/invoice-pdf'

export default defineEventHandler(async (event) => {
  const { clientId, customerId, ids } = getQuery(event) as {
    clientId?: string
    customerId?: string
    ids?: string
  }

  if (!customerId) throw createError({ statusCode: 400, message: 'customerId requis' })

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  const allOrders = await getOrdersForCustomer(Number(customerId), 100, ctx)

  
  let orders = allOrders.filter(o => o.invoiceNumber)

  
  if (ids) {
    const idSet = new Set(ids.split(',').map(Number))
    orders = orders.filter(o => idSet.has(o.id))
  }

  if (!orders.length) throw createError({ statusCode: 404, message: 'Aucune facture disponible' })

  
  const d = usePocPg()
  const shopRows: any[] = await d.execute(sql`SELECT value FROM cs_main.ps_configuration WHERE name = 'PS_SHOP_NAME' LIMIT 1`) as any[]
  const shopName = shopRows?.[0]?.value || 'Boutique'

  const resolvedClientId = clientId ? String(clientId) : resolveClientId(event)
  const { getThemePrimaryColor } = await import('~/modules/theme/server/utils/theme')
  const accentColor = (await getThemePrimaryColor({ clientId: resolvedClientId }).catch(() => null)) || '#4F46E5'

  
  const archive = archiver('zip', { zlib: { level: 5 } })
  const passthrough = new PassThrough()
  archive.pipe(passthrough)

  for (const order of orders) {
    const pdf = await generateInvoicePdf(order, shopName, accentColor)
    archive.append(pdf, { name: `facture-${order.invoiceNumber}-${order.reference}.pdf` })
  }

  await archive.finalize()

  
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
