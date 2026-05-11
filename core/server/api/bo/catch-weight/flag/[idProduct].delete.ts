

import { deleteProductCatchWeight } from '~/enterprise/vertical-food/catchweight/server/utils/catchweight'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'idProduct'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'idProduct invalide' })
  await deleteProductCatchWeight(id, { event })
  return { ok: true }
})
