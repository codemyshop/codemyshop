/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

/**
 * GET /api/bo/marketing/landing-pages/:id — landing page details
 * CMS (Sprint 18.1).
 *
 * Isolation: returns 404 if the requested id is attached to a
 * category other than root (1). Prevents a URL /hub/marketing/
 * landing-pages/:idArticleBlog from opening an article incorrectly.
 *
 * `id=new` returns a skeleton with categoryId=1 forced.
 */
export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)

  if (id === 'new') {
    return {
      page: {
        id: 0,
        categoryId: 1,
        active: 0,
        indexation: 1,
        title: '',
        metaDescription: '',
        linkRewrite: '',
        content: '',
        headSeoTitle: '',
      },
      isNew: true,
      langId,
    }
  }

  const db = useClientDb(event)

  const page = await db.get<any>(`
    SELECT
      c.id_cms           AS id,
      c.id_cms_category  AS categoryId,
      c.active,
      c.indexation,
      c.position,
      cl.meta_title      AS title,
      cl.head_seo_title  AS headSeoTitle,
      cl.meta_description AS metaDescription,
      cl.link_rewrite    AS linkRewrite,
      cl.content
    FROM ps_cms c
    LEFT JOIN ps_cms_lang cl ON cl.id_cms = c.id_cms AND cl.id_lang = ? AND cl.id_shop = 1
    WHERE c.id_cms = ?
  `, [langId, Number(id)])

  if (!page) throw createError({ statusCode: 404, message: 'Page introuvable' })

  // Sprint 18.1 — guard d'isolation : seules les pages de la
  // catégorie racine sont servies par cet endpoint.
  if (Number(page.categoryId) !== 1) {
    throw createError({ statusCode: 404, message: 'Page introuvable (hors landing)' })
  }

  return { page, isNew: false, langId }
})
