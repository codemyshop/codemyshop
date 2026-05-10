/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/** DELETE /api/bo/products/search-boost/aliases?id=X — deletes a synonym. */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const id = Number(q.id || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  const db = useClientDb(event)
  try {
    await db.run(`DELETE FROM ps_alias WHERE id_alias = ?`, [id])
    return { ok: true, id }
  } catch (err: any) {
    console.error('[bo/products/search-boost/aliases DELETE] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'Erreur DB' })
  }
})
