/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

/**
 * PUT /api/bo/marketing/blog-categories/:id — upsert CMS category.
 *
 * Multi-lang: master writes ps_cms_category + ps_cms_category_lang for
 * all languages; other languages only touch their own
 * ligne _lang via UPSERT.
 *
 * Safeguards: parent can never be itself nor a descendant
 * (cycle). level_depth is recalculated automatically. The root id=1
 * is protected (404).
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
    name: body.name !== undefined ? String(body.name || '').trim() : undefined,
    link_rewrite: body.linkRewrite !== undefined ? slugify(String(body.linkRewrite || '')) : undefined,
    description: body.description !== undefined ? String(body.description || '') : undefined,
    meta_title: body.metaTitle !== undefined ? String(body.metaTitle || '') : undefined,
    meta_description: body.metaDescription !== undefined ? String(body.metaDescription || '') : undefined,
  }

  // ─── Création ────────────────────────────────────────────────────
  if (isNew) {
    if (!isMaster) {
      throw createError({ statusCode: 400, message: 'Création autorisée uniquement en langue master (id_lang=1)' })
    }
    const name = langFields.name || ''
    const linkRewrite = langFields.link_rewrite || slugify(name)
    if (!name) throw createError({ statusCode: 422, message: 'Nom obligatoire' })
    if (!linkRewrite) throw createError({ statusCode: 422, message: 'URL obligatoire' })

    const parentId = Number(body.parentId) || 0
    if (parentId <= 0) throw createError({ statusCode: 422, message: 'Parent obligatoire' })

    const parent = await db.get<any>(`SELECT level_depth FROM ps_cms_category WHERE id_cms_category = ?`, [parentId])
    if (!parent) throw createError({ statusCode: 422, message: 'Parent introuvable' })

    // Unicité link_rewrite parmi les enfants du même parent (cohérence URL)
    const dup = await db.get<any>(`
      SELECT c.id_cms_category
      FROM ps_cms_category c
      JOIN ps_cms_category_lang cl ON cl.id_cms_category = c.id_cms_category AND cl.id_lang = 1
      WHERE c.id_parent = ? AND cl.link_rewrite = ?
    `, [parentId, linkRewrite])
    if (dup) throw createError({ statusCode: 422, message: `Slug déjà utilisé sous ce parent (catégorie #${dup.id_cms_category})` })

    const active = body.active === false ? 0 : 1
    const levelDepth = Number(parent.level_depth) + 1

    // Position : à la fin de la fratrie
    const maxPos = await db.get<any>(`SELECT COALESCE(MAX(position), -1) AS maxPos FROM ps_cms_category WHERE id_parent = ?`, [parentId])
    const nextPos = Number(maxPos?.maxPos ?? -1) + 1

    const insert = await db.run(`
      INSERT INTO ps_cms_category (id_parent, level_depth, active, date_add, date_upd, position)
      VALUES (?, ?, ?, NOW(), NOW(), ?)
    `, [parentId, levelDepth, active, nextPos])

    const newId = insert.insertId
    if (!newId) throw createError({ statusCode: 500, message: 'Échec création' })

    const langs = await db.query<any>(`SELECT id_lang FROM ps_lang WHERE active = 1`)
    for (const l of langs) {
      await db.run(`
        INSERT INTO ps_cms_category_lang
          (id_cms_category, id_lang, id_shop, name, description, link_rewrite, meta_title, meta_description)
        VALUES (?, ?, 1, ?, ?, ?, ?, ?)
      `, [
        newId, Number(l.id_lang),
        name,
        langFields.description || '',
        linkRewrite,
        langFields.meta_title || '',
        langFields.meta_description || '',
      ])
    }

    await db.run(`INSERT IGNORE INTO ps_cms_category_shop (id_cms_category, id_shop) VALUES (?, 1)`, [newId])

    return { success: true, id: newId, langId, isMaster, created: true }
  }

  // ─── Édition ─────────────────────────────────────────────────────
  const id = Number(rawId)
  if (!id || id === 1) throw createError({ statusCode: 404, message: 'Catégorie introuvable' })

  const existing = await db.get<any>(`SELECT id_cms_category, id_parent, level_depth FROM ps_cms_category WHERE id_cms_category = ?`, [id])
  if (!existing) throw createError({ statusCode: 404, message: 'Catégorie introuvable' })

  if (isMaster) {
    const cf: string[] = []
    const cp: any[] = []

    if (body.parentId !== undefined) {
      const newParent = Number(body.parentId) || 0
      if (newParent <= 0) throw createError({ statusCode: 422, message: 'Parent obligatoire' })
      if (newParent === id) throw createError({ statusCode: 422, message: 'Une catégorie ne peut être son propre parent' })

      const desc = await collectDescendants(db, id)
      if (desc.includes(newParent)) {
        throw createError({ statusCode: 422, message: 'Parent interdit (descendant de la catégorie — cycle)' })
      }

      const parent = await db.get<any>(`SELECT level_depth FROM ps_cms_category WHERE id_cms_category = ?`, [newParent])
      if (!parent) throw createError({ statusCode: 422, message: 'Parent introuvable' })

      const newDepth = Number(parent.level_depth) + 1
      cf.push('id_parent = ?'); cp.push(newParent)
      cf.push('level_depth = ?'); cp.push(newDepth)

      // Si le parent change, propager level_depth aux descendants
      if (Number(existing.id_parent) !== newParent) {
        await reindexDescendantsDepth(db, id, newDepth)
      }
    }

    if (body.active !== undefined) { cf.push('active = ?'); cp.push(body.active ? 1 : 0) }
    if (body.position !== undefined) { cf.push('position = ?'); cp.push(Math.max(0, Number(body.position) || 0)) }

    if (cf.length) {
      cf.push('date_upd = NOW()')
      await db.run(`UPDATE ps_cms_category SET ${cf.join(', ')} WHERE id_cms_category = ?`, [...cp, id])
    }
  }

  const hasAnyLangField = Object.values(langFields).some((v) => v !== undefined)
  if (hasAnyLangField) {
    const existingLang = await db.get<any>(`
      SELECT name, description, link_rewrite, meta_title, meta_description
        FROM ps_cms_category_lang WHERE id_cms_category = ? AND id_lang = ? AND id_shop = 1
    `, [id, langId])

    // Garde-fou : slug unique parmi les enfants du même parent (master only)
    if (isMaster && langFields.link_rewrite && langFields.link_rewrite !== existingLang?.link_rewrite) {
      const parentForCheck = body.parentId !== undefined ? Number(body.parentId) : Number(existing.id_parent)
      const dup = await db.get<any>(`
        SELECT c.id_cms_category
        FROM ps_cms_category c
        JOIN ps_cms_category_lang cl ON cl.id_cms_category = c.id_cms_category AND cl.id_lang = 1
        WHERE c.id_parent = ? AND cl.link_rewrite = ? AND c.id_cms_category <> ?
      `, [parentForCheck, langFields.link_rewrite, id])
      if (dup) throw createError({ statusCode: 422, message: `Slug déjà utilisé sous ce parent (catégorie #${dup.id_cms_category})` })
    }

    const row = {
      name: langFields.name ?? existingLang?.name ?? '',
      description: langFields.description ?? existingLang?.description ?? '',
      link_rewrite: langFields.link_rewrite ?? existingLang?.link_rewrite ?? slugify(langFields.name || existingLang?.name || ''),
      meta_title: langFields.meta_title ?? existingLang?.meta_title ?? '',
      meta_description: langFields.meta_description ?? existingLang?.meta_description ?? '',
    }

    await db.run(`
      INSERT INTO ps_cms_category_lang
        (id_cms_category, id_lang, id_shop, name, description, link_rewrite, meta_title, meta_description)
      VALUES (?, ?, 1, ?, ?, ?, ?, ?)
      ON CONFLICT (id_cms_category, id_shop, id_lang) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        link_rewrite = EXCLUDED.link_rewrite,
        meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description
    `, [
      id, langId,
      row.name, row.description, row.link_rewrite,
      row.meta_title, row.meta_description,
    ])
  }

  return { success: true, id, langId, isMaster, created: false }
})

async function collectDescendants(db: any, rootId: number): Promise<number[]> {
  const out: number[] = []
  const queue: number[] = [rootId]
  while (queue.length) {
    const current = queue.shift()!
    const children = await db.query<any>(
      `SELECT id_cms_category AS id FROM ps_cms_category WHERE id_parent = ?`,
      [current],
    )
    for (const c of children) {
      out.push(Number(c.id))
      queue.push(Number(c.id))
    }
  }
  return out
}

async function reindexDescendantsDepth(db: any, rootId: number, rootDepth: number) {
  // BFS : chaque niveau se voit attribuer rootDepth + distance depuis root.
  const queue: Array<{ id: number; depth: number }> = [{ id: rootId, depth: rootDepth }]
  const visited = new Set<number>([rootId])
  while (queue.length) {
    const { id: current, depth } = queue.shift()!
    const children = await db.query<any>(`SELECT id_cms_category AS id FROM ps_cms_category WHERE id_parent = ?`, [current])
    for (const c of children) {
      const childId = Number(c.id)
      if (visited.has(childId)) continue
      visited.add(childId)
      await db.run(`UPDATE ps_cms_category SET level_depth = ? WHERE id_cms_category = ?`, [depth + 1, childId])
      queue.push({ id: childId, depth: depth + 1 })
    }
  }
}

function slugify(input: string): string {
  return String(input || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128)
}
