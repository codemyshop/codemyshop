

import { listAvatarProductTargets } from '~/server/utils/hub-avatars-db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'id avatar requis' })
  }
  const items = await listAvatarProductTargets(id)
  return { items }
})
