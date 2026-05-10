/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

/**
 * PUT /api/bo/marketing/landing-pages/:id — upsert landing page
 * CMS (Sprint 18.1).
 *
 * Landing page specificity: category ALWAYS forced to 1, whether it's
 * in creation or in editing. The UI doesn't even offer a selector
 * for this block — the backend also enforces it to secure direct
 * requests.
 *
 * Isolation: returns 404 if the existing id is attached to another
 * category (prevents transforming a blog article into a landing
 * page via a PUT on /landing-pages/:idArticle).
 *
 * Multi-lang semantics Sprint 12 unchanged.
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

  // Helpers pour sérialiser les champs localisés depuis le body.
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

    // Sprint 18.1 — forcing catégorie racine, quoi que dise le body.
    const categoryId = 1
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

    // Une ligne ps_cms_lang par langue active (contrainte PS).
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

    return { success: true, id: newId, langId, isMaster, created: true }
  }

  // ─── Édition ─────────────────────────────────────────────────────
  const id = Number(rawId)
  const exists = await db.get<any>(`SELECT id_cms, id_cms_category FROM ps_cms WHERE id_cms = ?`, [id])
  if (!exists) throw createError({ statusCode: 404, message: 'Page introuvable' })

  // Sprint 18.1 — guard d'isolation : refuse d'éditer une ligne qui
  // n'est pas une landing page. Cet endpoint ne reclasse jamais un
  // article de blog en landing (et vice-versa) — choix produit,
  // l'UX est claire, le back la garde.
  if (Number(exists.id_cms_category) !== 1) {
    throw createError({ statusCode: 404, message: 'Page introuvable (hors landing)' })
  }

  // ps_cms — structure : master uniquement.
  // body.categoryId ignoré (contrainte landing = cat 1 figée).
  if (isMaster) {
    const cf: string[] = []
    const cp: any[] = []
    if (body.active !== undefined) { cf.push('active = ?'); cp.push(body.active ? 1 : 0) }
    if (body.indexation !== undefined) { cf.push('indexation = ?'); cp.push(body.indexation ? 1 : 0) }
    if (cf.length) {
      // Sprint 18.2 — ps_cms PS ancien n'a pas date_upd (Example Shop)
      await db.run(`UPDATE ps_cms SET ${cf.join(', ')} WHERE id_cms = ?`, [...cp, id])
    }
  }

  // ps_cms_lang — INSERT…ON CONFLICT DO UPDATE sur la langue
  // courante uniquement. On fusionne avec la ligne existante pour
  // ne jamais vider un champ qui n'a pas été envoyé par l'éditeur.
  const hasAnyLangField = Object.values(langFields).some((v) => v !== undefined)
  if (hasAnyLangField) {
    const existing = await db.get<any>(`
      SELECT meta_title, head_seo_title, meta_description, content, link_rewrite
        FROM ps_cms_lang WHERE id_cms = ? AND id_lang = ? AND id_shop = 1
    `, [id, langId])

    const row = {
      meta_title: langFields.meta_title ?? existing?.meta_title ?? '',
      head_seo_title: langFields.head_seo_title ?? existing?.head_seo_title ?? '',
      meta_description: langFields.meta_description ?? existing?.meta_description ?? '',
      content: langFields.content ?? existing?.content ?? '',
      link_rewrite: langFields.link_rewrite ?? existing?.link_rewrite ?? slugify(langFields.meta_title || existing?.meta_title || ''),
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

  return { success: true, id, langId, isMaster, created: false }
})

/**
 * Minimal slugify — ASCII lowercase, spaces and accents mapped. We
 * remain conservative to not reinvent the PS slug. The column
 * link_rewrite accepte a-z0-9-_, 128 chars max.
 */
function slugify(input: string): string {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128)
}
