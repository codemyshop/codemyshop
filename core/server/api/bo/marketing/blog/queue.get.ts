

import { requireRoleOrSaas } from '~/server/utils/session'
import { listQueueWithCovergen } from '~/enterprise/ai/cms-queue/server/utils/cms-queue'

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  try {
    const queue = await listQueueWithCovergen({ event })
    return { queue }
  } catch (err: any) {
    console.error('[bo/blog/queue] DB error:', err?.message)
    return { queue: [] }
  }
})
