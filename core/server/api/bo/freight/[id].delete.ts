

import { deleteFreightRule } from '~/modules/freight-rule/server/utils/freight-rule'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  await deleteFreightRule(id, { event })
  return { ok: true }
})
