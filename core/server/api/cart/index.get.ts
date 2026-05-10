/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/cart?cartId=...&clientId=...
 * DB direct (doctrine: Zero PrestaShop webservice, 2026-04-22).
 */
import { getCartFromDb } from '~/server/utils/cart-db'

export default defineEventHandler(async (event) => {
  const { cartId, clientId } = getQuery(event) as { cartId?: string; clientId?: string }
  if (!cartId) throw createError({ statusCode: 400, message: 'cartId requis' })

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  const cart = await getCartFromDb(Number(cartId), ctx)
  if (!cart) throw createError({ statusCode: 404, message: 'Panier introuvable' })
  return cart
})
