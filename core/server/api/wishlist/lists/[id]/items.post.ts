/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { requireCustomer } from '~/server/utils/customer-session'
import { addItem } from '~/server/utils/wishlist-db'

export default defineEventHandler(async (event) => {
  const session = requireCustomer(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'id invalide' })
  }
  const body = await readBody<{ id_product?: number; id_product_attribute?: number; quantity?: number }>(event).catch(() => ({}))

  const result = await addItem(
    id,
    session.customerId,
    Number(body?.id_product || 0),
    Number(body?.id_product_attribute || 0),
    Number(body?.quantity || 1),
    { event },
  )
  if (!result.ok) {
    throw createError({ statusCode: result.status || 500, message: result.error || 'addItem KO' })
  }
  return {
    success: true,
    added: !!result.added,
    incremented: !!result.incremented,
    id_wishlist_product: result.idWishlistProduct,
  }
})
