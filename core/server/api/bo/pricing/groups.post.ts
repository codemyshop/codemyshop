

import { createGroup } from '~/enterprise/misc/pricing/server/utils/pricing'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    name: string
    priority?: number
    active?: number
  }>(event)

  if (!body?.name) {
    throw createError({ statusCode: 400, statusMessage: 'name requis' })
  }
  if (body.name.length > 64) {
    throw createError({ statusCode: 400, statusMessage: 'name > 64 caractères' })
  }

  await createGroup({ name: body.name, priority: body.priority ?? 0, active: body.active ?? 1 }, { event })
  return { ok: true }
})
