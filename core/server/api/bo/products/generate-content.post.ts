/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { resolveClientId } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import {
  findExistingPendingProcessing,
  enqueueRedactionJob,
} from '~/enterprise/ai/product-queue/server/utils/product-queue'

/**
 * POST /api/bo/products/generate-content
 *
 * Inserts a product AI writing request in cs_product_queue.
 * The cron ac_redaction_cron.py processes the queue via Claude CLI.
 *
 * Body : { id_product, name, slug, instructions? }
 */
export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const body = await readBody(event)
  const idProduct = Number(body.id_product)
  const name = String(body.name || '').trim()
  const slug = String(body.slug || '').trim()
  const instructions = String(body.instructions || '').trim() || null

  if (!idProduct || !name || !slug) {
    throw createError({ statusCode: 422, message: 'id_product, name et slug requis' })
  }

  const tenant = resolveClientId(event) || 'ac-hub'

  try {
    const existing = await findExistingPendingProcessing(tenant, idProduct, { event })
    if (existing) {
      return {
        queued: true,
        id_redaction: existing.id_redaction,
        status: existing.status,
        message: 'Rédaction déjà en cours',
      }
    }

    const idRedaction = await enqueueRedactionJob({
      tenant, idProduct, name, slug, instructions,
    }, { event })

    return {
      queued: true,
      id_redaction: idRedaction,
      status: 'pending',
      message: 'Rédaction produit en file d\'attente — génération dans ~5 min',
    }
  } catch (err: any) {
    console.error('[products/generate-content] DB error:', err?.message)
    throw createError({ statusCode: 500, message: 'Erreur lors de la mise en queue' })
  }
})
