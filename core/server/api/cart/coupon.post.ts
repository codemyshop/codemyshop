

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { getCartFromDb, applyCouponToCart } from '~/server/utils/cart-db'

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  const { cartId, code, clientId } = body || {}
  if (!cartId || !code) throw createError({ statusCode: 400, message: 'cartId et code requis' })

  const ctx = clientId ? { clientId: String(clientId) } : { event }

  const cart = await getCartFromDb(Number(cartId), ctx)
  if (!cart) throw createError({ statusCode: 404, message: 'Panier introuvable' })

  
  const d = usePocPg()
  const ruleRows: any[] = await d.execute(sql`
    SELECT minimum_amount FROM cs_main.ps_cart_rule WHERE code = ${String(code)} AND active = 1 LIMIT 1
  `) as any[]
  const rule = ruleRows?.[0] || null
  if (rule) {
    const minAmount = Number(rule.minimum_amount ?? 0)
    if (minAmount > 0 && cart.totalHT < minAmount) {
      throw createError({
        statusCode: 400,
        message: `Montant minimum de ${minAmount.toFixed(2)} € HT requis pour ce code.`,
      })
    }
  }

  const result = await applyCouponToCart(Number(cartId), String(code), ctx)
  if (!result.ok) {
    throw createError({ statusCode: 404, message: result.error || 'Code promo invalide' })
  }

  const refreshed = await getCartFromDb(Number(cartId), ctx)
  if (!refreshed) throw createError({ statusCode: 500, message: 'Impossible de recharger le panier' })
  return refreshed
})
