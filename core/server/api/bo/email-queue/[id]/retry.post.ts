/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { retryQueuedEmail } from '~/server/utils/email-queue'

/**
 * POST /api/bo/email-queue/:id/retry — reinitialize a failed/cancelled
 * to pending (attempts=0, scheduled_at=NULL → ASAP at the next cron run).
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  const ok = await retryQueuedEmail(id)
  if (!ok) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Email introuvable ou non retryable (uniquement failed/cancelled)',
    })
  }
  return { ok: true }
})
