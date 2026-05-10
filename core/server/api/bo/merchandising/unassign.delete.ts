/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * DELETE /api/bo/merchandising/unassign?id_product=N&id_category=M
 *
 * Removes ONE `ps_category_product` association (selected category only —
 * other product categories untouched, see UI spec: drag to column 1 = remove
 * from the active category only).
 */
export default defineEventHandler(async (event) => {
  const { id_product, id_category } = getQuery(event)
  const idProduct = Number(id_product)
  const idCategory = Number(id_category)
  if (!idProduct || !idCategory) {
    throw createError({ statusCode: 400, message: 'id_product et id_category requis' })
  }

  const db = useClientDb(event)
  const res = await db.run(
    `DELETE FROM ps_category_product WHERE id_product = ? AND id_category = ?`,
    [idProduct, idCategory],
  )
  return { ok: true, id_product: idProduct, id_category: idCategory, affected: res.affectedRows }
})
