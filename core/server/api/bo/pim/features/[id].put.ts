

import { useClientDb } from '~/server/utils/db'
import { requireRoleOrSaas } from '~/server/utils/session'

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

  
  if (isNew) {
    if (!isMaster) throw createError({ statusCode: 400, message: 'Création autorisée uniquement en langue master' })
    const name = String(body.name || '').trim()
    if (!name) throw createError({ statusCode: 422, message: 'Nom obligatoire' })

    const maxPos = await db.get<any>(`SELECT COALESCE(MAX(position), -1) AS m FROM ps_feature`)
    const nextPos = Number(maxPos?.m ?? -1) + 1

    const insert = await db.run(`INSERT INTO ps_feature (position) VALUES (?)`, [nextPos])
    const newId = insert.insertId
    if (!newId) throw createError({ statusCode: 500, message: 'Échec création' })

    const langs = await db.query<any>(`SELECT id_lang FROM ps_lang WHERE active = 1`)
    for (const l of langs) {
      await db.run(`INSERT INTO ps_feature_lang (id_feature, id_lang, name) VALUES (?, ?, ?)`,
        [newId, Number(l.id_lang), name])
    }
    await db.run(`INSERT IGNORE INTO ps_feature_shop (id_feature, id_shop) VALUES (?, 1)`, [newId])

    if (Array.isArray(body.values)) {
      await upsertValues(db, newId, body.values, langs)
    }

    return { success: true, id: newId, langId, isMaster, created: true }
  }

  
  const id = Number(rawId)
  const exists = await db.get<any>(`SELECT id_feature FROM ps_feature WHERE id_feature = ?`, [id])
  if (!exists) throw createError({ statusCode: 404, message: 'Caractéristique introuvable' })

  if (isMaster && body.position !== undefined) {
    await db.run(`UPDATE ps_feature SET position = ? WHERE id_feature = ?`,
      [Math.max(0, Number(body.position) || 0), id])
  }

  if (body.name !== undefined) {
    const name = String(body.name || '').trim()
    if (!name) throw createError({ statusCode: 422, message: 'Nom obligatoire' })
    await db.run(`
      INSERT INTO ps_feature_lang (id_feature, id_lang, name) VALUES (?, ?, ?)
      ON CONFLICT (id_feature, id_lang) DO UPDATE SET name = EXCLUDED.name
    `, [id, langId, name])
  }

  if (Array.isArray(body.values)) {
    if (isMaster) {
      const langs = await db.query<any>(`SELECT id_lang FROM ps_lang WHERE active = 1`)
      await upsertValues(db, id, body.values, langs)
    } else {
      
      for (const v of body.values) {
        if (!v.id) continue
        await db.run(`
          INSERT INTO ps_feature_value_lang (id_feature_value, id_lang, value) VALUES (?, ?, ?)
          ON CONFLICT (id_feature_value, id_lang) DO UPDATE SET value = EXCLUDED.value
        `, [Number(v.id), langId, String(v.value || '')])
      }
    }
  }

  return { success: true, id, langId, isMaster, created: false }
})

async function upsertValues(db: any, idFeature: number, values: any[], langs: any[]) {
  const incomingIds = new Set<number>()

  for (const v of values) {
    const value = String(v.value || '').trim()
    if (!value) continue

    if (v.id && Number(v.id) > 0) {
      incomingIds.add(Number(v.id))
      
      
      
      await db.run(`
        INSERT INTO ps_feature_value_lang (id_feature_value, id_lang, value) VALUES (?, 1, ?)
        ON CONFLICT (id_feature_value, id_lang) DO UPDATE SET value = EXCLUDED.value
      `, [Number(v.id), value])
    } else {
      const ins = await db.run(`INSERT INTO ps_feature_value (id_feature, custom) VALUES (?, 0)`, [idFeature])
      const newValueId = ins.insertId
      if (!newValueId) continue
      incomingIds.add(newValueId)
      for (const l of langs) {
        await db.run(`INSERT INTO ps_feature_value_lang (id_feature_value, id_lang, value) VALUES (?, ?, ?)`,
          [newValueId, Number(l.id_lang), value])
      }
    }
  }

  
  const existing = await db.query<any>(`
    SELECT fv.id_feature_value AS id,
           (SELECT COUNT(*) FROM ps_feature_product fp WHERE fp.id_feature_value = fv.id_feature_value) AS used
    FROM ps_feature_value fv
    WHERE fv.id_feature = ? AND fv.custom = 0
  `, [idFeature])

  for (const e of existing) {
    if (!incomingIds.has(Number(e.id)) && Number(e.used) === 0) {
      await db.run(`DELETE FROM ps_feature_value_lang WHERE id_feature_value = ?`, [e.id])
      await db.run(`DELETE FROM ps_feature_value WHERE id_feature_value = ?`, [e.id])
    }
  }
}
