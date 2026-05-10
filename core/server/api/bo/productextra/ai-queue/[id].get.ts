/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/bo/productextra/ai-queue/:id
 * Remplace ac_productextra/ajaxgetaistatus (chantier #38 Phase B2).
 *
 * Polling every 5s on the Nuxt side. Statuses: pending | processing | done | failed.
 */
import { getAiQueueStatus } from '~/modules/product-extra/server/utils/productextra'

export default defineEventHandler(async (event) => {
  const idStr = getRouterParam(event, 'id')
  const idQueue = Number(idStr)
  if (!idQueue || idQueue <= 0) {
    throw createError({ statusCode: 400, message: 'id_queue invalide' })
  }
  const row = await getAiQueueStatus(idQueue, { event })
  if (!row) {
    throw createError({ statusCode: 404, message: 'Entrée introuvable' })
  }
  return {
    success: true,
    id_queue: row.id_queue,
    status: row.status,
    result_html: row.result_html,
    error_msg: row.error_msg,
  }
})
