/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { replaceFaqsForParent, upsertFaqTranslations } from '~/modules/faq/server/utils/faq'

/** PUT /api/bo/categories/:id — updates a PrestaShop category.
 *
 * Sprint 12 — multilang semantics:
 * - `?lang=1` (master): modifies PrestaShop structure + FR localized fields.
 * - `?lang>1` (translation): writes ONLY the localized fields of the
 * targeted language (via INSERT…ON DUPLICATE KEY). Fields
 *      structurels (parentId, active, groupIds, faqs ajout/suppression,
 * linkedPostIds) are ignored to never overwrite or duplicate.
 *
 * Existing FAQs are translated in place: INSERT…ON DUPLICATE KEY
 * on `cs_faq_lang` (composite key id_faq+id_lang). Additions/
 * FAQ deletions remain reserved for the master language.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || id < 2) throw createError({ statusCode: 400, message: 'id invalide' })
  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const isMaster = langId === 1

  const body = await readBody<{
    name?: string
    parentId?: number
    active?: boolean
    h1?: string
    summary?: string
    description?: string
    slug?: string
    metaTitle?: string
    metaDescription?: string
    groupIds?: number[]
    faqs?: Array<{ id?: number; position: number; active: boolean; question: string; answer: string }>
    linkedPostIds?: number[]
  }>(event)

  if (!body?.name?.trim()) throw createError({ statusCode: 400, message: 'Nom requis' })

  const d = usePocPg()

  const currentResult: any = await d.execute(sql`
    SELECT id_parent, level_depth FROM cs_main.ps_category WHERE id_category = ${id}
  `)
  const current = ((currentResult as any) as any[])[0]
  if (!current) throw createError({ statusCode: 404, message: 'Catégorie introuvable' })

  const slug = (body.slug?.trim() || body.name.trim())
    .toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  // ── Mutations structurelles — langue master uniquement ─────────────
  if (isMaster) {
    let depth = current.level_depth
    const newParent = body.parentId ?? current.id_parent
    if (newParent !== current.id_parent) {
      if (newParent === id) throw createError({ statusCode: 400, message: 'Une catégorie ne peut pas être son propre parent' })
      const parentResult: any = await d.execute(sql`
        SELECT level_depth FROM cs_main.ps_category WHERE id_category = ${newParent}
      `)
      const parent = ((parentResult as any) as any[])[0]
      if (!parent) throw createError({ statusCode: 400, message: 'Catégorie parent introuvable' })
      depth = (parent.level_depth ?? 1) + 1
    }

    await d.execute(sql`
      UPDATE cs_main.ps_category
      SET id_parent = ${newParent}, level_depth = ${depth}, active = ${body.active === false ? 0 : 1}, date_upd = NOW()
      WHERE id_category = ${id}
    `)
  }

  // ── Champs localisés — INSERT … ON CONFLICT DO UPDATE pour la langue ciblée
  // (équivalent PG de l'INSERT…ON DUPLICATE KEY MySQL). Permet la création de
  // traduction EN/DE même si la ligne _lang n'existe pas encore (incidents :
  // UPDATE silencieux qui sauvegarde fantôme).
  // Mapping Example Shop (vérifié sur /grossiste/ 2026-04-21) :
  //   - ps_category_lang.description            → intro HAUT (résumé)
  //   - ps_category_lang.additional_description → texte SEO BAS (long)
  // PK composite ps_category_lang : (id_category, id_shop, id_lang).
  await d.execute(sql`
    INSERT INTO cs_main.ps_category_lang
      (id_category, id_lang, id_shop, name, description, additional_description,
       link_rewrite, meta_title, meta_description)
    VALUES (${id}, ${langId}, 1, ${body.name.trim()}, ${body.summary ?? ''}, ${body.description ?? ''},
            ${slug}, ${body.metaTitle ?? body.name.trim()}, ${body.metaDescription ?? ''})
    ON CONFLICT (id_category, id_shop, id_lang) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      additional_description = EXCLUDED.additional_description,
      link_rewrite = EXCLUDED.link_rewrite,
      meta_title = EXCLUDED.meta_title,
      meta_description = EXCLUDED.meta_description
  `)

  // H1 i18n via ac_categoryextra. Master insère aussi le parent (1:1 ps_category).
  if (body.h1 !== undefined) {
    const { upsertCategoryH1 } = await import('~/modules/category-extra/server/utils/category-extra')
    await upsertCategoryH1(Number(id), langId, String(body.h1 || ''), { ensureParent: isMaster }, { event })
  }

  if (isMaster && Array.isArray(body.groupIds)) {
    const clean = Array.from(new Set(body.groupIds.map((n) => Number(n)).filter((n) => n > 0)))
    await d.execute(sql`DELETE FROM cs_main.ps_category_group WHERE id_category = ${id}`)
    for (const gid of clean) {
      await d.execute(sql`INSERT INTO cs_main.ps_category_group (id_category, id_group) VALUES (${id}, ${gid})`)
    }
  }

  // Sprint 11/12 — Silo SEO : FAQ + linked CMS posts.
  // cs_faq polymorphique : parent_type='category' + parent_id=id_category.
  if (Array.isArray(body.faqs)) {
    try {
      if (isMaster) {
        await replaceFaqsForParent('category', id, 1, body.faqs.map((f, i) => ({
          position: i,
          active: f.active !== false,
          question: String(f.question || ''),
          answer: String(f.answer || ''),
        })), { event })
      } else {
        await upsertFaqTranslations('category', id, langId, body.faqs.map((f) => ({
          id: Number(f.id),
          question: String(f.question || ''),
          answer: String(f.answer || ''),
        })), { event })
      }
    } catch (err: any) {
      // PG : table absente → 42P01 ; MySQL legacy : ER_NO_SUCH_TABLE / 1146.
      if (
        err?.code !== '42P01' &&
        err?.code !== 'ER_NO_SUCH_TABLE' && err?.errno !== 1146
      ) throw err
    }
  }

  if (isMaster && Array.isArray(body.linkedPostIds)) {
    const { replaceCategoryLinksFromCategory } = await import('~/modules/category-cms/server/utils/category-cms')
    await replaceCategoryLinksFromCategory(Number(id), body.linkedPostIds, { event })
  }

  return { success: true, id, slug, langId, isMaster }
})
