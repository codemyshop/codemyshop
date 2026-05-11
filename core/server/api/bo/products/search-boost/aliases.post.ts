

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ id?: number; alias?: string; search?: string; active?: boolean }>(event)
  const id     = Number(body?.id || 0)
  const alias  = String(body?.alias || '').trim().toLowerCase()
  const search = String(body?.search || '').trim().toLowerCase()
  const active = body?.active === false ? 0 : 1

  if (!alias || !search) {
    throw createError({ statusCode: 400, statusMessage: 'alias et search requis' })
  }
  if (alias === search) {
    throw createError({ statusCode: 400, statusMessage: 'alias et search doivent être différents' })
  }

  const db = useClientDb(event)
  try {
    if (id > 0) {
      await db.run(
        `UPDATE ps_alias SET alias = ?, search = ?, active = ? WHERE id_alias = ?`,
        [alias, search, active, id],
      )
      return { ok: true, id, alias, search, active: !!active }
    }
    
    
    
    const existing = await db.get<any>(
      `SELECT id_alias FROM ps_alias WHERE alias = ? LIMIT 1`,
      [alias],
    )
    if (existing?.id_alias) {
      await db.run(
        `UPDATE ps_alias SET search = ?, active = ? WHERE id_alias = ?`,
        [search, active, Number(existing.id_alias)],
      )
      return { ok: true, id: Number(existing.id_alias), alias, search, active: !!active }
    }
    const inserted = await db.run(
      `INSERT INTO ps_alias (alias, search, active) VALUES (?, ?, ?)`,
      [alias, search, active],
    )
    return { ok: true, id: Number(inserted.insertId || 0), alias, search, active: !!active }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[bo/products/search-boost/aliases POST] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'Erreur DB' })
  }
})
