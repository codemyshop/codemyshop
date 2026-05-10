/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * DELETE /api/cart/remove?cartId=...&productId=...&combinationId=...&clientId=...
 * DB direct (doctrine: Zero PrestaShop webservice, 2026-04-22).
 */
import { removeFromCartInDb } from '~/server/utils/cart-db'

export default defineEventHandler(async (event) => {
  const { cartId, productId, combinationId, clientId } = getQuery(event) as Record<string, string>
  if (!cartId || !productId) throw createError({ statusCode: 400, message: 'cartId et productId requis' })

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  await removeFromCartInDb(Number(cartId), Number(productId), Number(combinationId || 0), ctx)
  return { success: true }
})
