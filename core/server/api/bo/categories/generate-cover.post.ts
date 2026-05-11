

import { resolveClientId } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import {
  findExistingPendingProcessing,
  enqueueCoverJob,
} from '~/enterprise/ai/category-covergen/server/utils/category-covergen'

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const body = await readBody(event)
  const idCategory = Number(body.id_category)
  const name = String(body.name || '').trim()
  const slug = String(body.slug || '').trim()
  
  const keywordsRaw = String(body.keywords || '').replace(/[\t\r\n]+/g, ' ').trim()
  const keywords = keywordsRaw ? keywordsRaw.slice(0, 255) : null

  if (!idCategory || !name || !slug) {
    throw createError({ statusCode: 422, message: 'id_category, name et slug requis' })
  }

  const tenant = resolveClientId(event) || 'ac-hub'

  try {
    
    const existing = await findExistingPendingProcessing(tenant, idCategory, { event })
    if (existing) {
      return {
        queued: true,
        id_covergen: existing.id_covergen,
        status: existing.status,
        message: 'Génération déjà en cours',
      }
    }

    const idCovergen = await enqueueCoverJob({
      tenant, idCategory, name, slug, keywords,
    }, { event })

    return {
      queued: true,
      id_covergen: idCovergen,
      status: 'pending',
      message: 'Cover catégorie en file d\'attente — génération dans ~5 min',
    }
  } catch (err: any) {
    console.error('[categories/generate-cover] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur lors de la mise en queue' })
  }
})
