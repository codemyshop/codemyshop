

import { notifyUrlUpdated, notifyUrlsBatch } from '~/server/services/indexing'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ url?: string; urls?: string[] }>(event)

  if (body.urls?.length) {
    const result = await notifyUrlsBatch(body.urls)
    return { success: true, ...result }
  }

  if (body.url) {
    const result = await notifyUrlUpdated(body.url)
    return { success: true, ...result }
  }

  throw createError({ statusCode: 400, message: 'url ou urls requis' })
})
