/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * DELETE /api/bo/specific-prices/:id — deletes a promotion.
 */
import { useClientDb } from '~/server/utils/db'
import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  requireEmployeeSession(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'id invalide' })
  }
  const db = useClientDb(event)
  const res = await db.run(
    `DELETE FROM ps_specific_price WHERE id_specific_price = ?`,
    [id],
  )
  if (!res.affectedRows) {
    throw createError({ statusCode: 404, statusMessage: 'Promotion introuvable' })
  }
  return { ok: true, id }
})
