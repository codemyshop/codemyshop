/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/orders?customerId=...&limit=20&clientId=...
 * DB direct (doctrine: Zero PrestaShop webservice, 2026-04-22).
 */
import { getOrdersForCustomer } from '~/server/utils/orders-db'

export default defineEventHandler(async (event) => {
  const { customerId, limit, clientId } = getQuery(event) as Record<string, string>
  if (!customerId) throw createError({ statusCode: 400, message: 'customerId requis' })

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  return getOrdersForCustomer(Number(customerId), Math.min(Number(limit) || 20, 100), ctx)
})
