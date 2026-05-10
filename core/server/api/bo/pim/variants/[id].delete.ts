/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

/**
 * DELETE /api/bo/pim/variants/:id — deletes a group + its attributes +
 * its _lang/_shop. Rejects if at least one product combination uses a
 * group attribute.
 */
export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 404, message: 'Groupe introuvable' })

  const db = useClientDb(event)
  const exists = await db.get<any>(`SELECT id_attribute_group FROM ps_attribute_group WHERE id_attribute_group = ?`, [id])
  if (!exists) throw createError({ statusCode: 404, message: 'Groupe introuvable' })

  const used = await db.get<any>(`
    SELECT COUNT(DISTINCT pac.id_product_attribute) AS n
    FROM ps_product_attribute_combination pac
    JOIN ps_attribute a ON a.id_attribute = pac.id_attribute
    WHERE a.id_attribute_group = ?
  `, [id])
  if (Number(used?.n) > 0) {
    throw createError({ statusCode: 422, message: `${used.n} déclinaison(s) produit utilisent ce groupe — détachez-les avant suppression` })
  }

  await db.run(`DELETE al FROM ps_attribute_lang al JOIN ps_attribute a ON a.id_attribute = al.id_attribute WHERE a.id_attribute_group = ?`, [id])
  await db.run(`DELETE ash FROM ps_attribute_shop ash JOIN ps_attribute a ON a.id_attribute = ash.id_attribute WHERE a.id_attribute_group = ?`, [id])
  await db.run(`DELETE FROM ps_attribute WHERE id_attribute_group = ?`, [id])
  await db.run(`DELETE FROM ps_attribute_group_lang WHERE id_attribute_group = ?`, [id])
  await db.run(`DELETE FROM ps_attribute_group_shop WHERE id_attribute_group = ?`, [id])
  await db.run(`DELETE FROM ps_attribute_group WHERE id_attribute_group = ?`, [id])

  return { success: true, id }
})
