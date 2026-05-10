/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * DELETE /api/catalogue/customer/addresses/:id
 * Soft-delete: sets deleted=1 on ps_address (PS convention).
 * DB direct (doctrine: Zero PrestaShop webservice, 2026-04-22).
 */
import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  const db = useClientDb(event)
  const { affectedRows } = await db.run(
    `UPDATE ps_address SET deleted = 1, date_upd = NOW() WHERE id_address = ?`,
    [id],
  )
  if (!affectedRows) throw createError({ statusCode: 404, message: 'Adresse introuvable' })

  return { ok: true, id }
})
