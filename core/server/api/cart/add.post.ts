/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/cart/add
 * Body : { cartId, productId, quantity, combinationId, clientId }
 * DB direct (doctrine: Zero PrestaShop webservice, 2026-04-22).
 */
import { addToCartInDb, getCartFromDb } from '~/server/utils/cart-db'

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  const { cartId, productId, quantity, combinationId, clientId } = body || {}
  if (!cartId || !productId) throw createError({ statusCode: 400, message: 'cartId et productId requis' })

  const ctx = clientId ? { clientId: String(clientId) } : { event }
  await addToCartInDb(Number(cartId), Number(productId), Number(quantity || 1), Number(combinationId || 0), ctx)
  const cart = await getCartFromDb(Number(cartId), ctx)
  if (!cart) throw createError({ statusCode: 404, message: 'Panier introuvable après add' })
  return cart
})
