

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
