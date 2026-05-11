

import { resolveClientId } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import { getLatestCarouselStatus } from '~/enterprise/ai/covergen/server/utils/covergen'

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const { id_cms } = getQuery(event) as { id_cms: string }
  const idCms = Number(id_cms)
  if (!idCms) {
    throw createError({ statusCode: 422, message: 'id_cms requis' })
  }

  const tenant = resolveClientId(event) || 'ac-hub'

  try {
    const row = await getLatestCarouselStatus(tenant, idCms, { event })
    if (!row) return { found: false, status: null }
    return { found: true, ...row }
  } catch (err: any) {
    console.error('[carousel-status] DB error:', err?.message)
    return { found: false, status: null }
  }
})
