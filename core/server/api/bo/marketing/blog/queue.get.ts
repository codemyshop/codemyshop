/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { requireRoleOrSaas } from '~/server/utils/session'
import { listQueueWithCovergen } from '~/enterprise/ai/cms-queue/server/utils/cms-queue'

/**
 * GET /api/bo/marketing/blog/queue
 *
 * Lists articles from the AI writing queue (cs_cms_queue)
 * + covers (cs_covergen_queue). Remplace l'ancien module PS ac_autoblogarticle.
 */
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
