

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

function asArray<T = any>(result: any): T[] {
  return (result as T[]) ?? []
}
function firstOf<T = any>(result: any): T | null {
  return asArray<T>(result)[0] ?? null
}

export interface ShelfRow {
  id: number
  clientId: string
  sectionType: string
  position: number
  title: string | null
  subtitle: string | null
  content: Record<string, unknown> | null
  config: Record<string, unknown> | null
  active: boolean
  dateAdd: string
  dateUpd: string
}

function parseJson(raw: unknown): Record<string, unknown> | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'object') return raw as Record<string, unknown>
  try { return JSON.parse(String(raw)) } catch { return null }
}

function mapRow(r: any): ShelfRow {
  return {
    id: Number(r.id_shelf),
    clientId: String(r.client_id || ''),
    sectionType: String(r.section_type || ''),
    position: Number(r.position || 0),
    title: r.title ?? null,
    subtitle: r.subtitle ?? null,
    content: parseJson(r.content),
    config: parseJson(r.config),
    active: Number(r.active) === 1,
    dateAdd: String(r.date_add || ''),
    dateUpd: String(r.date_upd || ''),
  }
}

export interface ListShelvesFilter {
  clientId?: string
  sectionType?: string
  active?: number | boolean | null
}

export async function listShelves(filter: ListShelvesFilter = {}): Promise<ShelfRow[]> {
  const conds: any[] = []
  if (filter.clientId) conds.push(sql`client_id = ${filter.clientId}`)
  if (filter.sectionType) conds.push(sql`section_type = ${filter.sectionType}`)
  if (filter.active === undefined || filter.active === null) {
    conds.push(sql`active = 1`)
  } else {
    const v = Number(filter.active) === 0 ? 0 : 1
    conds.push(sql`active = ${v}`)
  }
  const whereClause = conds.length ? sql`WHERE ${sql.join(conds, sql` AND `)}` : sql``
  const result = asArray<any>(await usePocPg().execute(sql`
    SELECT * FROM cs_main.cs_shelf ${whereClause} ORDER BY position ASC
  `))
  return result.map(mapRow)
}

export async function getShelfById(id: number): Promise<ShelfRow | null> {
  if (!id || id <= 0) return null
  const row = await usePocPg().execute(sql`
    SELECT * FROM cs_main.cs_shelf WHERE id_shelf = ${id} LIMIT 1
  `).then(firstOf<any>)
  return row ? mapRow(row) : null
}

export interface UpsertShelfInput {
  id?: number
  clientId: string
  sectionType: string
  position?: number
  title?: string
  subtitle?: string
  content?: Record<string, unknown> | string | null
  config?: Record<string, unknown> | string | null
  active?: number | boolean
}

export interface UpsertShelfResult {
  ok: boolean
  id?: number
  action?: 'created' | 'updated'
  error?: string
  status?: number
}

function toJsonText(v: any): string {
  if (v == null || v === '') return ''
  if (typeof v === 'string') return v
  try { return JSON.stringify(v) } catch { return '' }
}

export async function upsertShelf(input: UpsertShelfInput): Promise<UpsertShelfResult> {
  const clientId = String(input.clientId || '').trim()
  const sectionType = String(input.sectionType || '').trim()
  if (!clientId || !sectionType) {
    return { ok: false, status: 400, error: 'Champs requis : clientId, sectionType' }
  }
  const position = Number(input.position || 0)
  const title = String(input.title ?? '')
  const subtitle = String(input.subtitle ?? '')
  const content = toJsonText(input.content)
  const config = toJsonText(input.config)
  const active = (input.active === 0 || input.active === false) ? 0 : 1
  const d = usePocPg()

  if (input.id && input.id > 0) {
    const exists = await d.execute(sql`
      SELECT id_shelf FROM cs_main.cs_shelf WHERE id_shelf = ${input.id} LIMIT 1
    `).then(firstOf<{ id_shelf: number }>)
    if (!exists) return { ok: false, status: 404, error: 'Shelf introuvable' }

    await d.execute(sql`
      UPDATE cs_main.cs_shelf
         SET client_id = ${clientId},
             section_type = ${sectionType},
             position = ${position},
             title = ${title},
             subtitle = ${subtitle},
             content = ${content},
             config = ${config},
             active = ${active},
             date_upd = NOW()
       WHERE id_shelf = ${input.id}
    `)
    return { ok: true, id: input.id, action: 'updated' }
  }

  const ins: any = await d.execute(sql`
    INSERT INTO cs_main.cs_shelf
        (client_id, section_type, position, title, subtitle, content, config, active, date_add, date_upd)
     VALUES (${clientId}, ${sectionType}, ${position}, ${title}, ${subtitle}, ${content}, ${config}, ${active}, NOW(), NOW())
     RETURNING id_shelf
  `)
  const newId = Number((ins as any[])?.[0]?.id_shelf ?? 0)
  if (!newId) return { ok: false, status: 500, error: 'INSERT cs_shelf KO' }
  return { ok: true, id: newId, action: 'created' }
}

export interface DeleteShelfResult {
  ok: boolean
  id?: number
  error?: string
  status?: number
}

export async function deleteShelf(id: number): Promise<DeleteShelfResult> {
  if (!id || id <= 0) return { ok: false, status: 400, error: 'Paramètre requis : id' }
  const d = usePocPg()
  const exists = await d.execute(sql`
    SELECT id_shelf FROM cs_main.cs_shelf WHERE id_shelf = ${id} LIMIT 1
  `).then(firstOf<{ id_shelf: number }>)
  if (!exists) return { ok: false, status: 404, error: 'Shelf introuvable' }
  await d.execute(sql`DELETE FROM cs_main.cs_shelf WHERE id_shelf = ${id}`)
  return { ok: true, id }
}
