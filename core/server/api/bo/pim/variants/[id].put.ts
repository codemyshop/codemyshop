/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

/**
 * PUT /api/bo/pim/variants/:id — upsert variant group and attributes.
 *
 * The master writes the structure (group_type, is_color_group, position) and the
 * language fields for ALL languages. Translations only modify their language.
 *
 * The attributes from the body are upserted; those not listed and not used
 * in a product combination are removed (master only).
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

  // ─── Création ────────────────────────────────────────────────────
  if (isNew) {
    if (!isMaster) throw createError({ statusCode: 400, message: 'Création autorisée uniquement en langue master' })
    const name = String(body.name || '').trim()
    const publicName = String(body.publicName || name).trim()
    if (!name) throw createError({ statusCode: 422, message: 'Nom obligatoire' })

    const groupType = ['select', 'color', 'radio'].includes(body.groupType) ? body.groupType : 'select'
    const isColorGroup = body.isColorGroup ? 1 : 0

    const maxPos = await db.get<any>(`SELECT COALESCE(MAX(position), -1) AS m FROM ps_attribute_group`)
    const nextPos = Number(maxPos?.m ?? -1) + 1

    const insert = await db.run(
      `INSERT INTO ps_attribute_group (is_color_group, group_type, position) VALUES (?, ?, ?)`,
      [isColorGroup, groupType, nextPos],
    )
    const newId = insert.insertId
    if (!newId) throw createError({ statusCode: 500, message: 'Échec création' })

    const langs = await db.query<any>(`SELECT id_lang FROM ps_lang WHERE active = 1`)
    for (const l of langs) {
      await db.run(
        `INSERT INTO ps_attribute_group_lang (id_attribute_group, id_lang, name, public_name) VALUES (?, ?, ?, ?)`,
        [newId, Number(l.id_lang), name, publicName],
      )
    }
    await db.run(`INSERT IGNORE INTO ps_attribute_group_shop (id_attribute_group, id_shop) VALUES (?, 1)`, [newId])

    if (Array.isArray(body.attributes)) {
      await upsertAttributes(db, newId, body.attributes, langs)
    }

    return { success: true, id: newId, langId, isMaster, created: true }
  }

  // ─── Édition ─────────────────────────────────────────────────────
  const id = Number(rawId)
  const exists = await db.get<any>(`SELECT id_attribute_group FROM ps_attribute_group WHERE id_attribute_group = ?`, [id])
  if (!exists) throw createError({ statusCode: 404, message: 'Groupe introuvable' })

  if (isMaster) {
    const cf: string[] = []
    const cp: any[] = []
    if (body.isColorGroup !== undefined) { cf.push('is_color_group = ?'); cp.push(body.isColorGroup ? 1 : 0) }
    if (body.groupType !== undefined) {
      const g = ['select', 'color', 'radio'].includes(body.groupType) ? body.groupType : 'select'
      cf.push('group_type = ?'); cp.push(g)
    }
    if (body.position !== undefined) { cf.push('position = ?'); cp.push(Math.max(0, Number(body.position) || 0)) }
    if (cf.length) await db.run(`UPDATE ps_attribute_group SET ${cf.join(', ')} WHERE id_attribute_group = ?`, [...cp, id])
  }

  const hasLang = body.name !== undefined || body.publicName !== undefined
  if (hasLang) {
    const existingLang = await db.get<any>(
      `SELECT name, public_name FROM ps_attribute_group_lang WHERE id_attribute_group = ? AND id_lang = ?`,
      [id, langId],
    )
    const name = body.name !== undefined ? String(body.name || '').trim() : (existingLang?.name || '')
    const publicName = body.publicName !== undefined ? String(body.publicName || '').trim() : (existingLang?.public_name || name)
    if (!name) throw createError({ statusCode: 422, message: 'Nom obligatoire' })
    await db.run(`
      INSERT INTO ps_attribute_group_lang (id_attribute_group, id_lang, name, public_name) VALUES (?, ?, ?, ?)
      ON CONFLICT (id_attribute_group, id_lang) DO UPDATE SET name = EXCLUDED.name, public_name = EXCLUDED.public_name
    `, [id, langId, name, publicName])
  }

  if (Array.isArray(body.attributes)) {
    if (isMaster) {
      const langs = await db.query<any>(`SELECT id_lang FROM ps_lang WHERE active = 1`)
      await upsertAttributes(db, id, body.attributes, langs)
    } else {
      // Traduction : upsert uniquement le name pour la langue courante
      for (const a of body.attributes) {
        if (!a.id) continue
        await db.run(`
          INSERT INTO ps_attribute_lang (id_attribute, id_lang, name) VALUES (?, ?, ?)
          ON CONFLICT (id_attribute, id_lang) DO UPDATE SET name = EXCLUDED.name
        `, [Number(a.id), langId, String(a.name || '')])
      }
    }
  }

  return { success: true, id, langId, isMaster, created: false }
})

async function upsertAttributes(db: any, idGroup: number, attrs: any[], langs: any[]) {
  const incomingIds = new Set<number>()

  for (let i = 0; i < attrs.length; i++) {
    const a = attrs[i]
    const name = String(a.name || '').trim()
    if (!name) continue
    const color = String(a.color || '').slice(0, 32)
    const position = Number(a.position ?? i)

    if (a.id && Number(a.id) > 0) {
      incomingIds.add(Number(a.id))
      await db.run(`UPDATE ps_attribute SET color = ?, position = ? WHERE id_attribute = ?`,
        [color, position, Number(a.id)])
      await db.run(`
        INSERT INTO ps_attribute_lang (id_attribute, id_lang, name) VALUES (?, 1, ?)
        ON CONFLICT (id_attribute, id_lang) DO UPDATE SET name = EXCLUDED.name
      `, [Number(a.id), name])
    } else {
      const ins = await db.run(
        `INSERT INTO ps_attribute (id_attribute_group, color, position) VALUES (?, ?, ?)`,
        [idGroup, color, position],
      )
      const newId = ins.insertId
      if (!newId) continue
      incomingIds.add(newId)
      for (const l of langs) {
        await db.run(`INSERT INTO ps_attribute_lang (id_attribute, id_lang, name) VALUES (?, ?, ?)`,
          [newId, Number(l.id_lang), name])
      }
      await db.run(`INSERT IGNORE INTO ps_attribute_shop (id_attribute, id_shop) VALUES (?, 1)`, [newId])
    }
  }

  // Supprime les attributs absents et non-utilisés en combinaison
  const existing = await db.query<any>(`
    SELECT a.id_attribute AS id,
           (SELECT COUNT(*) FROM ps_product_attribute_combination pac WHERE pac.id_attribute = a.id_attribute) AS used
    FROM ps_attribute a WHERE a.id_attribute_group = ?
  `, [idGroup])

  for (const e of existing) {
    if (!incomingIds.has(Number(e.id)) && Number(e.used) === 0) {
      await db.run(`DELETE FROM ps_attribute_lang WHERE id_attribute = ?`, [e.id])
      await db.run(`DELETE FROM ps_attribute_shop WHERE id_attribute = ?`, [e.id])
      await db.run(`DELETE FROM ps_attribute WHERE id_attribute = ?`, [e.id])
    }
  }
}
