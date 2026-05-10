/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { resolveClientId } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import {
  findExistingPendingProcessing,
  enqueueRedactionJob,
} from '~/enterprise/ai/category-queue/server/utils/category-queue'

/**
 * POST /api/bo/categories/generate-content
 *
 * Inserts a category AI writing request into cs_category_queue.
 * The cron ac_redaction_cron.py processes the queue via Claude CLI.
 *
 * Body : { id_category, name, slug, instructions? }
 */
export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const body = await readBody(event)
  const idCategory = Number(body.id_category)
  const name = String(body.name || '').trim()
  const slug = String(body.slug || '').trim()
  const instructions = String(body.instructions || '').trim() || null

  if (!idCategory || !name || !slug) {
    throw createError({ statusCode: 422, message: 'id_category, name et slug requis' })
  }

  const tenant = resolveClientId(event) || 'ac-hub'

  try {
    const existing = await findExistingPendingProcessing(tenant, idCategory, { event })
    if (existing) {
      return {
        queued: true,
        id_redaction: existing.id_redaction,
        status: existing.status,
        message: 'Rédaction déjà en cours',
      }
    }

    const idRedaction = await enqueueRedactionJob({
      tenant, idCategory, name, slug, instructions,
    }, { event })

    return {
      queued: true,
      id_redaction: idRedaction,
      status: 'pending',
      message: 'Rédaction catégorie en file d\'attente — génération dans ~5 min',
    }
  } catch (err: any) {
    console.error('[categories/generate-content] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur lors de la mise en queue' })
  }
})
