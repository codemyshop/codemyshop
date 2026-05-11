

import { unsubscribeByToken } from '~/server/utils/newsletter-subscriber'

export default defineEventHandler(async (event) => {
  const { token } = getQuery(event)
  const t = String(token ?? '').trim()
  if (!t) {
    throw createError({ statusCode: 400, statusMessage: 'token requis' })
  }
  const r = await unsubscribeByToken(t)
  return { ok: r.ok }
})
