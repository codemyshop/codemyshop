/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { resolveClientId } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import {
  findExistingPendingProcessing,
  enqueueRedactionJob,
} from '~/enterprise/ai/cms-queue/server/utils/cms-queue'

/**
 * POST /api/bo/marketing/blog/generate-content
 *
 * Inserts an AI writing request into cs_cms_queue.
 * The ac_redaction_cron.py / /api/cron/process-redaction cron processes the queue.
 *
 * Body : { id_cms, title, slug, metaDescription?, instructions?, model? }
 */
export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const body = await readBody(event)
  const idCms = Number(body.id_cms)
  const title = String(body.title || '').trim()
  const slug = String(body.slug || '').trim()
  const metaDesc = String(body.metaDescription || '').trim()
  const instructions = String(body.instructions || '').trim() || null
  const model = String(body.model || 'gemini-2.5-flash').trim()

  if (!idCms || !title || !slug) {
    throw createError({ statusCode: 422, message: 'id_cms, title et slug requis' })
  }

  const tenant = resolveClientId(event) || 'ac-hub'

  try {
    const existing = await findExistingPendingProcessing(tenant, idCms, { event })
    if (existing) {
      return {
        queued: true,
        id_redaction: existing.id_redaction,
        status: existing.status,
        message: 'Rédaction déjà en cours',
      }
    }

    const idRedaction = await enqueueRedactionJob({
      tenant, idCms, title, slug, metaDescription: metaDesc, instructions, model,
    }, { event })

    return {
      queued: true,
      id_redaction: idRedaction,
      status: 'pending',
      message: 'Rédaction en file d\'attente — génération dans ~5 min',
    }
  } catch (err: any) {
    console.error('[generate-content] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur lors de la mise en queue' })
  }
})
