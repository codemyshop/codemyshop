/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

/**
 * GET /api/bo/marketing/blog/export — CSV of blog articles.
 *
 * Isolation Sprint 18.1 : WHERE id_cms_category <> 1 (exclusion racine /
 * landings). Default language id_lang=1. No content (too large,
 * and the import must not overwrite AI-generated content in bulk).
 */
export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const db = useClientDb(event)

  const rows = await db.query<any>(`
    SELECT
      c.id_cms                       AS id,
      c.id_cms_category              AS categoryId,
      COALESCE(ccl.name, '')         AS categoryName,
      COALESCE(cl.meta_title, '')    AS title,
      COALESCE(cl.link_rewrite, '')  AS linkRewrite,
      COALESCE(cl.meta_description, '') AS metaDescription,
      c.active,
      c.indexation
    FROM ps_cms c
    LEFT JOIN ps_cms_lang cl
      ON cl.id_cms = c.id_cms AND cl.id_lang = 1 AND cl.id_shop = 1
    LEFT JOIN ps_cms_category_lang ccl
      ON ccl.id_cms_category = c.id_cms_category AND ccl.id_lang = 1 AND ccl.id_shop = 1
    WHERE c.id_cms_category <> 1
    ORDER BY c.id_cms ASC
  `)

  const headers = ['ID', 'Catégorie ID', 'Catégorie', 'Titre', 'URL', 'Meta description', 'Actif', 'Indexation']

  const esc = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v)
    if (/[;"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }

  const lines: string[] = []
  lines.push(headers.join(';'))
  for (const r of rows) {
    lines.push([
      r.id,
      r.categoryId,
      esc(r.categoryName),
      esc(r.title),
      esc(r.linkRewrite),
      esc(r.metaDescription),
      Number(r.active) ? 1 : 0,
      Number(r.indexation) ? 1 : 0,
    ].join(';'))
  }

  const csv = '\ufeff' + lines.join('\r\n')

  const filename = `blog-export-${new Date().toISOString().slice(0, 10)}.csv`
  setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
  return csv
})
