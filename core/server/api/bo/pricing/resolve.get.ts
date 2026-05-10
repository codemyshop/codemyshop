/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { resolvePrice } from '~/enterprise/misc/pricing/server/utils/pricing'

/**
 * GET /api/bo/pricing/resolve?product=X&customer=Y&qty=N
 *
 * Resolves the applied price according to priority:
 *   1. contrat client actif
 * 2. group tier (highest min_quantity ≤ qty)
 *   3. prix catalogue (fallback)
 *
 * Returns { price, source, rule: { id, label } } for debug and UI display.
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const idProduct  = Number(q.product)
  const idCustomer = Number(q.customer)
  const qty        = Number(q.qty ?? 1)

  if (!idProduct || !idCustomer) {
    throw createError({ statusCode: 400, statusMessage: 'product et customer requis' })
  }

  const { price, source, rule } = await resolvePrice(idCustomer, idProduct, qty, { event })
  return { ok: true, price, source, rule }
})
