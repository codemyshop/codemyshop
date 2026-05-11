

import { upsertShelf } from '~/server/utils/shelves-db'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    id?: number
    clientId: string
    sectionType: string
    position?: number
    title?: string
    subtitle?: string
    content?: Record<string, unknown>
    config?: Record<string, unknown>
    active?: number
  }>(event)

  const result = await upsertShelf(body)
  if (!result.ok) {
    throw createError({ statusCode: result.status || 500, message: result.error || 'upsertShelf KO' })
  }
  return { ok: true, id: result.id, action: result.action }
})
