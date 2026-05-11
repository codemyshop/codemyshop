

import { resolveClientId } from '~/server/utils/db'
import { listSubscribers, type SubscriberStatus } from '~/server/utils/newsletter-subscriber'

const VALID_STATUSES = new Set(['pending', 'confirmed', 'unsubscribed', 'bounced', 'all'])

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const clientId = resolveClientId(event)
  const status = String(q.status ?? 'all')
  if (!VALID_STATUSES.has(status)) {
    throw createError({ statusCode: 400, statusMessage: 'status invalide' })
  }
  const limit = Number(q.limit ?? 50)
  const offset = Number(q.offset ?? 0)
  const search = q.q ? String(q.q).trim() : undefined

  return await listSubscribers({
    clientId,
    status: status as SubscriberStatus | 'all',
    q: search,
    limit,
    offset,
  })
})
