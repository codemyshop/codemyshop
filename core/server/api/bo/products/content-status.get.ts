

import { resolveClientId } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import { getLatestStatusForProduct, countQueueAhead } from '~/enterprise/ai/product-queue/server/utils/product-queue'

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const { id_product } = getQuery(event) as { id_product: string }
  const idProduct = Number(id_product)
  if (!idProduct) {
    throw createError({ statusCode: 422, message: 'id_product requis' })
  }

  const tenant = resolveClientId(event) || 'ac-hub'

  try {
    const row = await getLatestStatusForProduct(tenant, idProduct, { event })
    if (!row) return { found: false, status: null }

    let queuePosition = 0
    let estimatedSeconds = 0
    if (row.status === 'pending' || row.status === 'processing') {
      try {
        queuePosition = await countQueueAhead(row.id_redaction, { event })
        estimatedSeconds = queuePosition * 120 
        if (row.status === 'processing') {
          const elapsed = Math.floor((Date.now() - new Date(row.date_upd).getTime()) / 1000)
          estimatedSeconds = Math.max(30, 120 - elapsed)
          queuePosition = 0
        }
      } catch {  }
    }

    return { found: true, ...row, queuePosition, estimatedSeconds }
  } catch (err: any) {
    console.error('[products/content-status] DB error:', err?.message)
    return { found: false, status: null }
  }
})
