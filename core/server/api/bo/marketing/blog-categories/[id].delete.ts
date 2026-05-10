/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

/**
 * DELETE /api/bo/marketing/blog-categories/:id — deletes a CMS category.
 *
 * Rejects deletion if the category has articles (ps_cms) or
 * children (ps_cms_category) to avoid orphans. The admin must
 * reassign or delete dependents first.
 *
 * Root id=1 is protected (404).
 */
export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const rawId = getRouterParam(event, 'id')
  const id = Number(rawId)
  if (!id || id === 1) throw createError({ statusCode: 404, message: 'Catégorie introuvable' })

  const db = useClientDb(event)

  const existing = await db.get<any>(`SELECT id_cms_category FROM ps_cms_category WHERE id_cms_category = ?`, [id])
  if (!existing) throw createError({ statusCode: 404, message: 'Catégorie introuvable' })

  const articles = await db.get<any>(`SELECT COUNT(*) AS n FROM ps_cms WHERE id_cms_category = ?`, [id])
  if (Number(articles?.n) > 0) {
    throw createError({ statusCode: 422, message: `${articles.n} article(s) rattaché(s) — réaffectez-les avant suppression` })
  }

  const children = await db.get<any>(`SELECT COUNT(*) AS n FROM ps_cms_category WHERE id_parent = ?`, [id])
  if (Number(children?.n) > 0) {
    throw createError({ statusCode: 422, message: `${children.n} sous-catégorie(s) — supprimez-les ou réaffectez-les avant` })
  }

  await db.run(`DELETE FROM ps_cms_category_lang WHERE id_cms_category = ?`, [id])
  await db.run(`DELETE FROM ps_cms_category_shop WHERE id_cms_category = ?`, [id])
  await db.run(`DELETE FROM ps_cms_category WHERE id_cms_category = ?`, [id])

  return { success: true, id }
})
