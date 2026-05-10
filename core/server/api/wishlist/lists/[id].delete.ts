/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { requireCustomer } from '~/server/utils/customer-session'
import { deleteList } from '~/server/utils/wishlist-db'

export default defineEventHandler(async (event) => {
  const session = requireCustomer(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'id invalide' })
  }
  const result = await deleteList(id, session.customerId, { event })
  if (!result.ok) {
    throw createError({ statusCode: result.status || 500, message: result.error || 'deleteList KO' })
  }
  return { success: true, deleted: true, id_wishlist: id }
})
