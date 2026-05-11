

import { requireCustomer } from '~/server/utils/customer-session'
import { updateList } from '~/server/utils/wishlist-db'

export default defineEventHandler(async (event) => {
  const session = requireCustomer(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'id invalide' })
  }
  const body = await readBody<{ name?: string; is_default?: boolean }>(event).catch(() => ({}))

  const result = await updateList(
    id,
    session.customerId,
    { name: body?.name, isDefault: body?.is_default ?? null },
    { event },
  )
  if (!result.ok) {
    throw createError({ statusCode: result.status || 500, message: result.error || 'updateList KO' })
  }
  return { success: true, updated: !!result.updated, id_wishlist: id }
})
