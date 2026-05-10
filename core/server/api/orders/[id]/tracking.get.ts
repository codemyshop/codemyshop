/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/orders/:id/tracking?clientId=...
 * Returns the status history of an order.
 * DB direct (doctrine: Zero PrestaShop webservice, 2026-04-22).
 */
import { getOrderHistoryFromDb } from '~/server/utils/orders-db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const { clientId } = getQuery(event) as { clientId?: string }
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  return getOrderHistoryFromDb(id, ctx)
})
