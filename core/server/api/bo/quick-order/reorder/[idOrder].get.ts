

import { cloneOrderItems } from '~/modules/quickorder/server/utils/quickorder'

export default defineEventHandler(async (event) => {
  const idOrder = Number(getRouterParam(event, 'idOrder'))
  if (!idOrder) throw createError({ statusCode: 400, statusMessage: 'idOrder invalide' })

  const result = await cloneOrderItems(idOrder, { event })
  if (!result) throw createError({ statusCode: 404, statusMessage: 'commande introuvable' })

  return { ok: true, order: result.order, items: result.items }
})
