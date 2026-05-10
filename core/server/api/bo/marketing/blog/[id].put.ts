/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'
import { replaceFaqsForParent, upsertFaqTranslations } from '~/modules/faq/server/utils/faq'
import { upsertCmsExtra as upsertCmsExtraFacade } from '~/modules/cms-extra/server/utils/cms-extra'

/**
 * PUT /api/bo/marketing/blog/:id — upsert article de blog
 * (Sprint 18.1).
 *
 * Blog requirement: category is mandatory and different from 1.
 * - Creation: body.categoryId required, returns 422 if absent or = 1.
 * - Editing: accepts category mutation but returns 422 if
 * attempting to change it back to 1 (reclassification forbidden).
 *
 * Isolation: returns 404 if the existing id is attached to the
 * root category (it is a landing, not an article).
 *
 * Multilang semantics Sprint 12 unchanged: master writes ps_cms +
 * ps_cms_lang master; translation writes only ps_cms_lang from
 * sa langue via UPSERT.
 */
export default defineEventHandler(async (event) => {
  requireRoleOrSaas(event, ['root', 'founder', 'market'])

  const rawId = getRouterParam(event, 'id')
  if (!rawId) throw createError({ statusCode: 400, message: 'id requis' })

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const isMaster = langId === 1

  const body = await readBody<Record<string, any>>(event)
  const db = useClientDb(event)

  const isNew = rawId === 'new' || Number(rawId) === 0

  const langFields = {
    meta_title: body.title !== undefined ? String(body.title || '') : undefined,
    head_seo_title: body.headSeoTitle !== undefined ? String(body.headSeoTitle || '') : undefined,
    meta_description: body.metaDescription !== undefined ? String(body.metaDescription || '') : undefined,
    link_rewrite: body.linkRewrite !== undefined ? slugify(String(body.linkRewrite || '')) : undefined,
    content: body.content !== undefined ? String(body.content || '') : undefined,
  }

  // ─── Création ────────────────────────────────────────────────────
  if (isNew) {
    if (!isMaster) {
      throw createError({ statusCode: 400, message: 'Création autorisée uniquement en langue master (id_lang=1)' })
    }
    const title = langFields.meta_title || ''
    const linkRewrite = langFields.link_rewrite || slugify(title)
    if (!title) throw createError({ statusCode: 422, message: 'Titre obligatoire' })
    if (!linkRewrite) throw createError({ statusCode: 422, message: 'URL obligatoire' })

    // Garde-fou doublon slug
    const dupCheck = await db.get<any>(
      `SELECT c.id_cms FROM ps_cms c JOIN ps_cms_lang cl ON c.id_cms = cl.id_cms AND cl.id_lang = 1
       WHERE c.active = 1 AND cl.link_rewrite = ?`, [linkRewrite])
    if (dupCheck) {
      throw createError({ statusCode: 422, message: `Slug déjà utilisé par l'article #${dupCheck.id_cms}` })
    }

    const categoryId = Number(body.categoryId) || 0
    if (categoryId <= 0 || categoryId === 1) {
      throw createError({ statusCode: 422, message: 'Catégorie de blog obligatoire (≠ racine)' })
    }

    const active = body.active ? 1 : 0
    const indexation = body.indexation === false ? 0 : 1

    // Sprint 18.2 — ps_cms PS ancien n'a pas date_add/date_upd (Example Shop)
    const insert = await db.run(`
      INSERT INTO ps_cms
        (id_cms_category, position, active, indexation)
      VALUES (?, 0, ?, ?)
    `, [categoryId, active, indexation])

    const newId = insert.insertId
    if (!newId) throw createError({ statusCode: 500, message: 'Échec création' })

    const langs = await db.query<any>(`SELECT id_lang FROM ps_lang WHERE active = 1`)
    for (const l of langs) {
      await db.run(`
        INSERT INTO ps_cms_lang
          (id_cms, id_lang, id_shop, meta_title, head_seo_title, meta_description, content, link_rewrite)
        VALUES (?, ?, 1, ?, ?, ?, ?, ?)
      `, [
        newId,
        Number(l.id_lang),
        title,
        langFields.head_seo_title || '',
        langFields.meta_description || '',
        langFields.content || '',
        linkRewrite,
      ])
    }

    // cms_extra — upsert tous les champs éditoriaux via façade
    try {
      await upsertCmsExtraFacade(newId, body, { event })
    } catch { /* table may not exist on all tenants */ }

    return { success: true, id: newId, langId, isMaster, created: true }
  }

  // --- Editing ---
  const id = Number(rawId)
  const exists = await db.get<any>(`SELECT id_cms, id_cms_category FROM ps_cms WHERE id_cms = ?`, [id])
  if (!exists) throw createError({ statusCode: 404, message: 'Article introuvable' })

  // Guard isolation: this endpoint only serves blog articles.
  if (Number(exists.id_cms_category) === 1) {
    throw createError({ statusCode: 404, message: 'Article introuvable (landing page)' })
  }

  if (isMaster) {
    const cf: string[] = []
    const cp: any[] = []
    if (body.categoryId !== undefined) {
      const newCat = Number(body.categoryId) || 0
      if (newCat <= 0 || newCat === 1) {
        throw createError({ statusCode: 422, message: 'Catégorie de blog obligatoire (≠ racine)' })
      }
      cf.push('id_cms_category = ?'); cp.push(newCat)
    }
    if (body.active !== undefined) { cf.push('active = ?'); cp.push(body.active ? 1 : 0) }
    if (body.indexation !== undefined) { cf.push('indexation = ?'); cp.push(body.indexation ? 1 : 0) }
    if (cf.length) {
      // Sprint 18.2 — legacy ps_cms doesn't have date_upd (reference case)
      await db.run(`UPDATE ps_cms SET ${cf.join(', ')} WHERE id_cms = ?`, [...cp, id])
    }
  }

  const hasAnyLangField = Object.values(langFields).some((v) => v !== undefined)
  if (hasAnyLangField) {
    const existingLang = await db.get<any>(`
      SELECT meta_title, head_seo_title, meta_description, content, link_rewrite
        FROM ps_cms_lang WHERE id_cms = ? AND id_lang = ? AND id_shop = 1
    `, [id, langId])

    // Safeguard against duplicate slugs in editing.
    const newSlug = langFields.link_rewrite ?? existingLang?.link_rewrite
    if (newSlug && langFields.link_rewrite && langFields.link_rewrite !== existingLang?.link_rewrite) {
      const dupCheck = await db.get<any>(
        `SELECT c.id_cms FROM ps_cms c JOIN ps_cms_lang cl ON c.id_cms = cl.id_cms AND cl.id_lang = 1
         WHERE c.active = 1 AND cl.link_rewrite = ? AND c.id_cms <> ?`, [langFields.link_rewrite, id])
      if (dupCheck) {
        throw createError({ statusCode: 422, message: `Slug déjà utilisé par l'article #${dupCheck.id_cms}` })
      }
    }

    const row = {
      meta_title: langFields.meta_title ?? existingLang?.meta_title ?? '',
      head_seo_title: langFields.head_seo_title ?? existingLang?.head_seo_title ?? '',
      meta_description: langFields.meta_description ?? existingLang?.meta_description ?? '',
      content: langFields.content ?? existingLang?.content ?? '',
      link_rewrite: langFields.link_rewrite ?? existingLang?.link_rewrite ?? slugify(langFields.meta_title || existingLang?.meta_title || ''),
    }

    await db.run(`
      INSERT INTO ps_cms_lang
        (id_cms, id_lang, id_shop, meta_title, head_seo_title, meta_description, content, link_rewrite)
      VALUES (?, ?, 1, ?, ?, ?, ?, ?)
      ON CONFLICT (id_cms, id_shop, id_lang) DO UPDATE SET
        meta_title = EXCLUDED.meta_title,
        head_seo_title = EXCLUDED.head_seo_title,
        meta_description = EXCLUDED.meta_description,
        content = EXCLUDED.content,
        link_rewrite = EXCLUDED.link_rewrite
    `, [
      id, langId,
      row.meta_title, row.head_seo_title, row.meta_description,
      row.content, row.link_rewrite,
    ])
  }

  // -- FAQ via service (parent_type='cms') --
  // Master : delete-then-insert atomique. Traduction : upsert lang.
  if (isMaster && Array.isArray(body.faqs)) {
    try {
      await replaceFaqsForParent('cms', id, langId, body.faqs.map((f: any, i: number) => ({
        position: i,
        active: !!f.active,
        question: String(f.question || ''),
        answer: String(f.answer || '').trim(),
      })), { event })
    } catch (err: any) {
      if (err?.errno !== 1146 && err?.code !== 'ER_NO_SUCH_TABLE') {
        console.error('[bo/blog PUT] FAQ save error:', err?.message)
      }
    }
  } else if (!isMaster && Array.isArray(body.faqs)) {
    try {
      await upsertFaqTranslations('cms', id, langId, body.faqs.map((f: any) => ({
        id: Number(f.id),
        question: String(f.question || ''),
        answer: String(f.answer || ''),
      })), { event })
    } catch { /* table may not exist */ }
  }

  // -- Related product categories (master only) --
  if (isMaster && Array.isArray(body.linkedCategoryIds)) {
    try {
      const { replaceCategoryLinksFromCms } = await import('~/modules/category-cms/server/utils/category-cms')
      await replaceCategoryLinksFromCms(Number(id), body.linkedCategoryIds, { event })
    } catch (err: any) {
      console.error('[bo/blog PUT] linkedCategories save error:', err?.message)
    }
  }

  // -- cms_extra — editorial upsert via service --
  if (isMaster) {
    try {
      await upsertCmsExtraFacade(id, body, { event })
    } catch (err: any) {
      if (err?.errno !== 1146 && err?.code !== 'ER_NO_SUCH_TABLE') {
        console.error('[bo/blog PUT] cms_extra save error:', err?.message)
      }
    }
  }

  return { success: true, id, langId, isMaster, created: false }
})

function slugify(input: string): string {
  // Preserves the -- (3-segment blog separators: pillar--subcategory--slug)
  // Strategy: slugify each segment independently.
  const raw = String(input || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  return raw
    .split('--')
    .map(seg => seg.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('--')
    .slice(0, 255)
}
