/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/orders/:id?clientId=...
 * DB direct (doctrine: Zero PrestaShop webservice, 2026-04-22).
 */
import { getOrderFromDb } from '~/server/utils/orders-db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const { clientId } = getQuery(event) as { clientId?: string }
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  const order = await getOrderFromDb(id, ctx)
  if (!order) throw createError({ statusCode: 404, message: 'Commande introuvable' })
  return order
})
