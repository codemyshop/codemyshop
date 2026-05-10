/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * DELETE /api/cart/coupon — Removes promo codes from a cart.
 * Body: { cartId, clientId }
 * DB direct (doctrine: Zero PrestaShop webservice, 2026-04-22).
 */
import { removeCouponFromCart, getCartFromDb } from '~/server/utils/cart-db'

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  const { cartId, clientId } = body || {}
  if (!cartId) throw createError({ statusCode: 400, message: 'cartId requis' })

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  await removeCouponFromCart(Number(cartId), ctx)
  const refreshed = await getCartFromDb(Number(cartId), ctx)
  if (!refreshed) throw createError({ statusCode: 500, message: 'Impossible de recharger le panier' })
  return refreshed
})
