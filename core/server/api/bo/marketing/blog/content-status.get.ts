/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { resolveClientId } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import { getLatestStatusForCms, countQueueAhead } from '~/enterprise/ai/cms-queue/server/utils/cms-queue'

/**
 * GET /api/bo/marketing/blog/content-status?id_cms=227
 *
 * Returns the latest status of AI writing for an article.
 * Used by the back office for polling after 'AI writing' click.
 */
export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const { id_cms } = getQuery(event) as { id_cms: string }
  const idCms = Number(id_cms)
  if (!idCms) {
    throw createError({ statusCode: 422, message: 'id_cms requis' })
  }

  const tenant = resolveClientId(event) || 'ac-hub'

  try {
    const row = await getLatestStatusForCms(tenant, idCms, { event })
    if (!row) return { found: false, status: null }

    let queuePosition = 0
    let estimatedSeconds = 0
    if (row.status === 'pending' || row.status === 'processing') {
      try {
        queuePosition = await countQueueAhead(row.id_redaction, { event })
        estimatedSeconds = queuePosition * 180 // ~3 min/article
        if (row.status === 'processing') {
          const elapsed = Math.floor((Date.now() - new Date(row.date_upd).getTime()) / 1000)
          estimatedSeconds = Math.max(30, 180 - elapsed)
          queuePosition = 0
        }
      } catch { /* silent */ }
    }

    return { found: true, ...row, queuePosition, estimatedSeconds }
  } catch (err: any) {
    console.error('[content-status] DB error:', err?.message)
    return { found: false, status: null }
  }
})
