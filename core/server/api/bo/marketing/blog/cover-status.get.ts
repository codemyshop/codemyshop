/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { resolveClientId } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import { getLatestCovergenStatus } from '~/enterprise/ai/covergen/server/utils/covergen'

/**
 * GET /api/bo/marketing/blog/cover-status?id_cms=227
 *
 * Returns the latest status of cover generation for an article via
 * the cover generation service. Used by the backoffice for polling after "Generate" click.
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
    const row = await getLatestCovergenStatus(tenant, idCms, { event })
    if (!row) return { found: false, status: null }
    return { found: true, ...row }
  } catch (err: any) {
    console.error('[cover-status] DB error:', err?.message)
    return { found: false, status: null }
  }
})
