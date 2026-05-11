

import { setAvatarGeographicZones } from '~/server/utils/hub-avatars-db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'id avatar requis' })
  }
  const body = await readBody<{ items?: Array<{ zoneType?: string; zoneCode: string; zoneLabel: string; position: number; weight?: number; reason?: string }> }>(event)
  const items = Array.isArray(body?.items) ? body!.items : []
  const result = await setAvatarGeographicZones(id, items)
  return result
})
