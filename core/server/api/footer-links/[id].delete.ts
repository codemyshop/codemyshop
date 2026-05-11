

import { resolveClientId } from '~/server/utils/db'
import { deleteLink } from '~/modules/footer/server/utils/footer'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const idFooter = Number(id)
  if (!idFooter) throw createError({ statusCode: 400, message: 'Invalid id' })

  const clientId = resolveClientId(event)
  await deleteLink(idFooter, clientId, { event })

  return { ok: true }
})
