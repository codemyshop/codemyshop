/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { resolveClientId } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import { getLatestStatusForCategory, countQueueAhead } from '~/enterprise/ai/category-queue/server/utils/category-queue'

/**
 * GET /api/bo/categories/content-status?id_category=23
 *
 * Returns the latest AI writing status for a category.
 * Used by the back office for polling after 'AI writing' click.
 */
export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const { id_category } = getQuery(event) as { id_category: string }
  const idCategory = Number(id_category)
  if (!idCategory) {
    throw createError({ statusCode: 422, message: 'id_category requis' })
  }

  const tenant = resolveClientId(event) || 'ac-hub'

  try {
    const row = await getLatestStatusForCategory(tenant, idCategory, { event })
    if (!row) return { found: false, status: null }

    let queuePosition = 0
    let estimatedSeconds = 0
    if (row.status === 'pending' || row.status === 'processing') {
      try {
        queuePosition = await countQueueAhead(row.id_redaction, { event })
        estimatedSeconds = queuePosition * 180 // ~3 min/catégorie (FAQ + descriptions)
        if (row.status === 'processing') {
          const elapsed = Math.floor((Date.now() - new Date(row.date_upd).getTime()) / 1000)
          estimatedSeconds = Math.max(30, 180 - elapsed)
          queuePosition = 0
        }
      } catch { /* silent */ }
    }

    return { found: true, ...row, queuePosition, estimatedSeconds }
  } catch (err: any) {
    console.error('[categories/content-status] DB error:', err?.message)
    return { found: false, status: null }
  }
})
