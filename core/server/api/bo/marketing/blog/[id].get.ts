/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import { listFaqsByParent } from '~/modules/faq/server/utils/faq'
import { getCmsExtraForBlogEdit } from '~/modules/cms-extra/server/utils/cms-extra'

/**
 * GET /api/bo/marketing/blog/:id — blog article details
 * (Sprint 18.1).
 *
 * Isolation: returns 404 if the requested id is linked to the
 * root category (1) — it would be a landing page, not an article.
 *
 * `id=new` returns a skeleton with categoryId = 0 (the UI forces
 * the user to choose a category other than root).
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
        categoryId: 0,
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

  if (!page) throw createError({ statusCode: 404, message: 'Article introuvable' })

  // Sprint 18.1 — guard d'isolation : seuls les articles (cat ≠ 1)
  // sont servis par cet endpoint.
  if (Number(page.categoryId) === 1) {
    throw createError({ statusCode: 404, message: 'Article introuvable (landing page)' })
  }

  // ── CMS Extra (cs_cms_extra) via façade ac_cmsextra ──────────
  let pageType: string | null = null
  try {
    const extra = await getCmsExtraForBlogEdit(Number(id), { event })
    if (extra) {
      pageType = extra.page_type || null
      try { page.targetAvatarIds = JSON.parse(extra.target_avatar_ids || '[]') } catch { page.targetAvatarIds = [] }
      page.editorialBrief = extra.editorial_brief || ''
      page.authorEmployeeId = extra.author_employee_id ? Number(extra.author_employee_id) : null
      page.socialCoverUrl = extra.social_cover_url || null
      page.idsProductAssociation = extra.ids_product_association || ''
      page.idsCmsAssociation = extra.ids_cms_association || ''
      page.audioEnabled = !!extra.audio_enabled
      page.audioUrl = extra.audio_url || ''
      page.audioText = extra.audio_text || ''
      page.audioScore = extra.audio_score ? Number(extra.audio_score) : null
      page.audioGeneratedAt = extra.audio_generated_at || null
      page.reelScript = extra.reel_script || ''
      page.reelEnabled = !!extra.reel_enabled
    }
  } catch { /* table may differ between tenants */ }
  page.pageType = pageType
  if (!page.targetAvatarIds) page.targetAvatarIds = []
  if (!page.editorialBrief) page.editorialBrief = ''
  if (!page.authorEmployeeId) page.authorEmployeeId = null

  // ── FAQ via ac_faq facade (parent_type='cms') ───────────────────
  // BO admin: includes inactive ones as well (toggle in UI).
  let faqs: any[] = []
  try {
    const items = await listFaqsByParent('cms', Number(id), langId, { event }, { onlyActive: false })
    faqs = items.map(it => ({
      id: it.id,
      position: it.position,
      active: it.active ? 1 : 0,
      question: it.question,
      answer: it.answer,
    }))
  } catch (err: any) {
    if (err?.errno !== 1146 && err?.code !== 'ER_NO_SUCH_TABLE') {
      console.error('[bo/blog] FAQ load error:', err?.message)
    }
  }

  // ── Related product categories (cs_category_cms) ────────
  let linkedCategories: any[] = []
  try {
    linkedCategories = await db.query<any>(`
      SELECT a.id_category AS id, a.position,
             COALESCE(cl2.name, '') AS name,
             cat.active
      FROM cs_category_cms a
      JOIN ps_category cat ON cat.id_category = a.id_category
      LEFT JOIN ps_category_lang cl2 ON cl2.id_category = a.id_category AND cl2.id_lang = ? AND cl2.id_shop = 1
      WHERE a.id_cms = ?
      ORDER BY a.position ASC
    `, [langId, Number(id)])
  } catch (err: any) {
    if (err?.errno !== 1146 && err?.code !== 'ER_NO_SUCH_TABLE') {
      console.error('[bo/blog] linkedCategories load error:', err?.message)
    }
  }

  return { page, faqs, linkedCategories, isNew: false, langId }
})
