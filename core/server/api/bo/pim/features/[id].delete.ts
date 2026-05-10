/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

/**
 * DELETE /api/bo/pim/features/:id — deletes a feature + its
 * values + all its _lang/_shop. Rejects if at least one product uses
 * one of its values.
 */
export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 404, message: 'Caractéristique introuvable' })

  const db = useClientDb(event)
  const exists = await db.get<any>(`SELECT id_feature FROM ps_feature WHERE id_feature = ?`, [id])
  if (!exists) throw createError({ statusCode: 404, message: 'Caractéristique introuvable' })

  const used = await db.get<any>(`
    SELECT COUNT(DISTINCT fp.id_product) AS n
    FROM ps_feature_product fp
    JOIN ps_feature_value fv ON fv.id_feature_value = fp.id_feature_value
    WHERE fv.id_feature = ?
  `, [id])
  if (Number(used?.n) > 0) {
    throw createError({ statusCode: 422, message: `${used.n} produit(s) utilisent cette caractéristique — détachez-les avant suppression` })
  }

  await db.run(`DELETE fvl FROM ps_feature_value_lang fvl JOIN ps_feature_value fv ON fv.id_feature_value = fvl.id_feature_value WHERE fv.id_feature = ?`, [id])
  await db.run(`DELETE FROM ps_feature_value WHERE id_feature = ?`, [id])
  await db.run(`DELETE FROM ps_feature_lang WHERE id_feature = ?`, [id])
  await db.run(`DELETE FROM ps_feature_shop WHERE id_feature = ?`, [id])
  await db.run(`DELETE FROM ps_feature WHERE id_feature = ?`, [id])

  return { success: true, id }
})
