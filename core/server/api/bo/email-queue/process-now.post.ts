/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { processEmailQueue } from '~/server/utils/email-queue'

/**
 * POST /api/bo/email-queue/process-now — manual queue drain.
 *
 * Bypass the 60s cron (email:queue-process). Useful for testing without
 * waiting for the next tick after queuing an email via the
 * "Send a test" button of the template editor.
 *
 * Default limit = 5 (vs 1 for cron) — the admin explicitly
 * requested a drain, no need to stay sub-second under the MTA radar.
 * Hard cap at 20 to avoid weakening the reputation.
 *
 * Body : { limit?: number } (default 5, max 20)
 */
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
