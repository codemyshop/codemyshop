/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { requireCustomer } from '~/server/utils/customer-session'
import { createList } from '~/server/utils/wishlist-db'

export default defineEventHandler(async (event) => {
  const session = requireCustomer(event)
  const body = await readBody<{ name?: string }>(event).catch(() => ({}))
  const result = await createList(session.customerId, String(body?.name || ''), { event })
  if (!result.ok) {
    throw createError({ statusCode: result.status || 500, message: result.error || 'createList KO' })
  }
  return {
    success: true,
    id_wishlist: result.idWishlist,
    name: result.name,
    is_default: result.isDefault,
  }
})
