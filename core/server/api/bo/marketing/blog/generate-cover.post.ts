

import { resolveClientId } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import {
  findPendingCovergen,
  insertCovergenJob,
} from '~/enterprise/ai/covergen/server/utils/covergen'
import { getCmsExtraAvatarTargets } from '~/modules/cms-extra/server/utils/cms-extra'
import { getAvatarDefinitionForCover } from '~/modules/avatars/server/utils/avatars'

export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const body = await readBody(event)
  const idCms = Number(body.id_cms)
  const title = String(body.title || '').trim()
  const slug = String(body.slug || '').trim()
  const withAvatar = body.withAvatar ? 1 : 0

  if (!idCms || !title || !slug) {
    throw createError({ statusCode: 422, message: 'id_cms, title et slug requis' })
  }

  const tenant = resolveClientId(event) || 'ac-hub'

  try {
    const existing = await findPendingCovergen(tenant, idCms, { event })
    if (existing) {
      return {
        queued: true,
        id_covergen: existing.id_covergen,
        status: existing.status,
        message: 'Génération déjà en cours',
      }
    }

    
    let avatarId: number | null = null
    let expressionSlug: string | null = body.avatarExpression ? String(body.avatarExpression) : null
    let expressionImageUrl: string | null = body.avatarImageUrl ? String(body.avatarImageUrl) : null

    if (withAvatar && !expressionImageUrl) {
      try {
        const extra = await getCmsExtraAvatarTargets(idCms, { event })
        if (extra?.target_avatar_ids) {
          const ids: number[] = JSON.parse(extra.target_avatar_ids || '[]')
          if (ids.length > 0) {
            avatarId = ids[0]
            const avatarRow = await getAvatarDefinitionForCover(avatarId, { event })
            if (avatarRow) {
              const pageType = extra.page_type || ''
              const exprMap = avatarRow.page_type_expression_map
                ? (typeof avatarRow.page_type_expression_map === 'string' ? JSON.parse(avatarRow.page_type_expression_map) : avatarRow.page_type_expression_map)
                : {}
              expressionSlug = exprMap[pageType] || 'neutral'

              const personas = avatarRow.personas
                ? (typeof avatarRow.personas === 'string' ? JSON.parse(avatarRow.personas) : avatarRow.personas)
                : null
              if (Array.isArray(personas)) {
                for (const p of personas) {
                  if (!p.expressions) continue
                  const match = p.expressions.find((e: any) => e.slug === expressionSlug)
                  if (match?.imageUrl) {
                    expressionImageUrl = match.imageUrl
                    break
                  }
                }
              }
            }
          }
        }
      } catch {  }
    }

    const id = await insertCovergenJob({
      tenant,
      idCms,
      title,
      slug,
      withAvatar,
      avatarId,
      expressionSlug,
      expressionImageUrl,
    }, { event })

    return {
      queued: true,
      id_covergen: id,
      status: 'pending',
      message: 'Cover en file d\'attente — génération dans ~5 min',
    }
  } catch (err: any) {
    console.error('[generate-cover] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur lors de la mise en queue' })
  }
})
