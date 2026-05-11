

import { processEmailQueue } from '~/server/utils/email-queue'

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({})) as { limit?: number }
  const limit = Math.max(1, Math.min(20, Number(body?.limit) || 5))

  const outcome = await processEmailQueue({ limit })
  return {
    ok: true,
    scanned:   outcome.scanned,
    processed: outcome.processed,
    errors:    outcome.errors,
    items:     outcome.items,
  }
})
