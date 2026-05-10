/**
 *
 * Direct DB helper for /api/hub/avatars — zero-webservice doctrine
 * PrestaShop » 2026-04-22. Table : cs_avatar_definition (personas IA
 * for content generators, single-tenant hub).
 *
 * Targets PostgreSQL `cs_main` (effort #44 MariaDB removal).
 *
 * Technical debt note: keywords / personas / page_type_expression_map are TEXT
 * JSON → violation §NAMING.11. Pre-existing, out of scope; to normalize with
 * cs_avatar_persona / cs_avatar_keyword if feature rewrite.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

function asArray<T = any>(result: any): T[] {
  return (result as T[]) ?? []
}
function firstOf<T = any>(result: any): T | null {
  return asArray<T>(result)[0] ?? null
}

function parseJson<T = unknown>(raw: any, fallback: T): T {
  if (raw == null || raw === '') return fallback
  if (typeof raw === 'object') return raw as T
  try { return JSON.parse(String(raw)) as T } catch { return fallback }
}

export interface AvatarRow {
  id: number
  name: string
  slug: string
  icon: string
  colorClass: string
  keywords: string[]
  toneRules: string
  buyingBehavior: string
  painPoints: string
  goals: string
  objections: string
  preferredChannels: string
  budgetRange: string
  decisionCycle: string
  contentPreferences: string
  demographics: string
  personas: string[]
  pageTypeExpressionMap: Record<string, unknown>
  active: boolean
  dateAdd: string
  dateUpd: string
}

function mapRow(r: any): AvatarRow {
  return {
    id: Number(r.id_avatar_definition),
    name: String(r.name || ''),
    slug: String(r.slug || ''),
    icon: String(r.icon || '👤'),
    colorClass: String(r.color_class || 'bg-violet-100 text-violet-700'),
    keywords: parseJson<string[]>(r.keywords, []),
    toneRules: String(r.tone_rules || ''),
    buyingBehavior: String(r.buying_behavior || ''),
    painPoints: String(r.pain_points || ''),
    goals: String(r.goals || ''),
    objections: String(r.objections || ''),
    preferredChannels: String(r.preferred_channels || ''),
    budgetRange: String(r.budget_range || ''),
    decisionCycle: String(r.decision_cycle || ''),
    contentPreferences: String(r.content_preferences || ''),
    demographics: String(r.demographics || ''),
    personas: parseJson<string[]>(r.personas, []),
    pageTypeExpressionMap: parseJson<Record<string, unknown>>(r.page_type_expression_map, {}),
    active: Number(r.active) === 1,
    dateAdd: String(r.date_add || ''),
    dateUpd: String(r.date_upd || ''),
  }
}

function sanitizeSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
}

function toJsonText(v: any, fallback: string): string {
  if (v == null) return fallback
  if (typeof v === 'string') return v
  try { return JSON.stringify(v) } catch { return fallback }
}

/** Liste des avatars actifs (active=1), tri par date_upd DESC. */
export async function listAvatars(): Promise<AvatarRow[]> {
  const result = await usePocPg().execute(sql`
    SELECT * FROM cs_main.cs_avatar_definition WHERE active = 1 ORDER BY date_upd DESC
  `)
  return asArray<any>(result).map(mapRow)
}

/** One avatar by id, null if missing. */
export async function getAvatarById(id: number): Promise<AvatarRow | null> {
  if (!id || id <= 0) return null
  const row = await usePocPg().execute(sql`
    SELECT * FROM cs_main.cs_avatar_definition WHERE id_avatar_definition = ${id} LIMIT 1
  `).then(firstOf<any>)
  return row ? mapRow(row) : null
}

export interface CreateAvatarInput {
  name: string
  slug: string
  icon?: string
  colorClass?: string
  keywords?: any[]
  toneRules?: string
  buyingBehavior?: string
  painPoints?: string
  goals?: string
  objections?: string
  preferredChannels?: string
  budgetRange?: string
  decisionCycle?: string
  contentPreferences?: string
  demographics?: string
  personas?: any[]
  pageTypeExpressionMap?: Record<string, unknown>
}

export interface AvatarMutationResult {
  ok: boolean
  id?: number
  error?: string
  status?: number
}

/** Creates an avatar (normalized slug, serialized JSON). */
export async function createAvatar(input: CreateAvatarInput): Promise<AvatarMutationResult> {
  const name = String(input.name || '').trim()
  const slug = sanitizeSlug(String(input.slug || ''))
  if (!name || !slug) return { ok: false, status: 400, error: 'name et slug requis' }

  const ins: any = await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_avatar_definition
        (name, slug, icon, color_class, keywords, tone_rules, buying_behavior,
         pain_points, goals, objections, preferred_channels, budget_range,
         decision_cycle, content_preferences, demographics, personas,
         page_type_expression_map, active, date_add, date_upd)
     VALUES (
       ${name}, ${slug}, ${String(input.icon || '👤')},
       ${String(input.colorClass || 'bg-violet-100 text-violet-700')},
       ${toJsonText(input.keywords, '[]')},
       ${String(input.toneRules || '')},
       ${String(input.buyingBehavior || '')},
       ${String(input.painPoints || '')},
       ${String(input.goals || '')},
       ${String(input.objections || '')},
       ${String(input.preferredChannels || '')},
       ${String(input.budgetRange || '')},
       ${String(input.decisionCycle || '')},
       ${String(input.contentPreferences || '')},
       ${String(input.demographics || '')},
       ${toJsonText(input.personas, '[]')},
       ${toJsonText(input.pageTypeExpressionMap, '{}')},
       1, NOW(), NOW()
     )
    RETURNING id_avatar_definition AS "idAvatarDefinition"
  `)
  const id = Number((ins as any[])?.[0]?.idAvatarDefinition ?? 0)
  if (!id) return { ok: false, status: 500, error: 'INSERT cs_avatar_definition KO' }
  return { ok: true, id }
}

export interface UpdateAvatarInput extends Partial<CreateAvatarInput> {
  id: number
  active?: number | boolean
}

const SCALAR_FIELDS: Record<keyof Omit<UpdateAvatarInput, 'id' | 'keywords' | 'personas' | 'pageTypeExpressionMap' | 'active'>, string> = {
  name: 'name', slug: 'slug', icon: 'icon',
  colorClass: 'color_class', toneRules: 'tone_rules',
  buyingBehavior: 'buying_behavior', painPoints: 'pain_points',
  goals: 'goals', objections: 'objections',
  preferredChannels: 'preferred_channels', budgetRange: 'budget_range',
  decisionCycle: 'decision_cycle', contentPreferences: 'content_preferences',
  demographics: 'demographics',
}

/** Partial update of an avatar. */
export async function updateAvatar(input: UpdateAvatarInput): Promise<AvatarMutationResult> {
  const id = Number(input.id || 0)
  if (!id) return { ok: false, status: 400, error: 'id requis' }

  const sets: any[] = []
  for (const [camel, snake] of Object.entries(SCALAR_FIELDS)) {
    const value = (input as any)[camel]
    if (value !== undefined) {
      const v = camel === 'slug' ? sanitizeSlug(String(value)) : String(value)
      sets.push(sql`${sql.identifier(snake)} = ${v}`)
    }
  }
  if (input.keywords !== undefined) sets.push(sql`keywords = ${toJsonText(input.keywords, '[]')}`)
  if (input.personas !== undefined) sets.push(sql`personas = ${toJsonText(input.personas, '[]')}`)
  if (input.pageTypeExpressionMap !== undefined) {
    sets.push(sql`page_type_expression_map = ${toJsonText(input.pageTypeExpressionMap, '{}')}`)
  }
  if (input.active !== undefined) {
    const a = (input.active === 0 || input.active === false) ? 0 : 1
    sets.push(sql`active = ${a}`)
  }

  if (!sets.length) return { ok: true, id }
  sets.push(sql`date_upd = NOW()`)

  await usePocPg().execute(sql`
    UPDATE cs_main.cs_avatar_definition SET ${sql.join(sets, sql`, `)} WHERE id_avatar_definition = ${id}
  `)
  return { ok: true, id }
}

/** Soft delete — sets active to 0. */
export async function softDeleteAvatar(id: number): Promise<AvatarMutationResult> {
  if (!id || id <= 0) return { ok: false, status: 400, error: 'id requis' }
  await usePocPg().execute(sql`
    UPDATE cs_main.cs_avatar_definition SET active = 0, date_upd = NOW() WHERE id_avatar_definition = ${id}
  `)
  return { ok: true, id }
}

// ────────────────────────────────────────────────────────────────
// Top N produits cibles par avatar (cs_avatar_product_target)
// ────────────────────────────────────────────────────────────────

export interface AvatarProductTarget {
  idProduct: number
  productName: string
  reference: string
  position: number
  reason: string
}

export async function listAvatarProductTargets(idAvatar: number): Promise<AvatarProductTarget[]> {
  const result = await usePocPg().execute(sql`
    SELECT t.id_product, COALESCE(pl.name, '') AS name, COALESCE(p.reference, '') AS reference,
           t.position, COALESCE(t.reason, '') AS reason
      FROM cs_main.cs_avatar_product_target t
      LEFT JOIN cs_main.ps_product p ON p.id_product = t.id_product
      LEFT JOIN cs_main.ps_product_lang pl
             ON pl.id_product = t.id_product AND pl.id_lang = 1 AND pl.id_shop = 1
     WHERE t.id_avatar_definition = ${idAvatar}
     ORDER BY t.position ASC
  `)
  return asArray<any>(result).map((r) => ({
    idProduct: Number(r.id_product),
    productName: String(r.name || ''),
    reference: String(r.reference || ''),
    position: Number(r.position),
    reason: String(r.reason || ''),
  }))
}

/**
 * Set top N (replace all): DELETE then INSERT. Simpler than
 * MERGE for a list that changes rarely and stays small (3-5 items).
 */
export async function setAvatarProductTargets(
  idAvatar: number,
  items: Array<{ idProduct: number; position: number; reason?: string }>,
): Promise<{ ok: true; count: number }> {
  // Filtre + dédup côté JS pour éviter les contraintes UNIQUE qui sautent
  const clean = items
    .filter((it) => Number.isFinite(it.idProduct) && it.idProduct > 0 && it.position >= 1 && it.position <= 10)
    .reduce((acc, it) => {
      // Une seule entrée par (avatar, position) ET (avatar, idProduct)
      if (acc.some((x) => x.position === it.position || x.idProduct === it.idProduct)) return acc
      acc.push(it)
      return acc
    }, [] as Array<{ idProduct: number; position: number; reason?: string }>)

  await usePocPg().execute(sql`
    DELETE FROM cs_main.cs_avatar_product_target
     WHERE id_avatar_definition = ${idAvatar}
  `)
  for (const it of clean) {
    await usePocPg().execute(sql`
      INSERT INTO cs_main.cs_avatar_product_target
        (id_avatar_definition, id_product, position, reason, date_add, date_upd)
      VALUES
        (${idAvatar}, ${it.idProduct}, ${it.position}, ${it.reason ?? ''}, NOW(), NOW())
    `)
  }
  return { ok: true, count: clean.length }
}

// ────────────────────────────────────────────────────────────────
// Zones d'influence géographique par avatar (cs_avatar_geographic_zone)
// ────────────────────────────────────────────────────────────────

export interface AvatarGeographicZone {
  zoneType: 'region' | 'departement' | 'country' | 'city' | string
  zoneCode: string
  zoneLabel: string
  position: number
  weight: number
  reason: string
}

export async function listAvatarGeographicZones(idAvatar: number): Promise<AvatarGeographicZone[]> {
  const result = await usePocPg().execute(sql`
    SELECT zone_type, zone_code, zone_label, position, weight, COALESCE(reason, '') AS reason
      FROM cs_main.cs_avatar_geographic_zone
     WHERE id_avatar_definition = ${idAvatar}
     ORDER BY position ASC
  `)
  return asArray<any>(result).map((r) => ({
    zoneType: String(r.zone_type || 'region'),
    zoneCode: String(r.zone_code || ''),
    zoneLabel: String(r.zone_label || ''),
    position: Number(r.position),
    weight: Number(r.weight),
    reason: String(r.reason || ''),
  }))
}

/**
 * Set influence zones (replace-all): DELETE then INSERT. List
 * small and changes rarely (3-10 zones max), no MERGE.
 */
export async function setAvatarGeographicZones(
  idAvatar: number,
  items: Array<{ zoneType?: string; zoneCode: string; zoneLabel: string; position: number; weight?: number; reason?: string }>,
): Promise<{ ok: true; count: number }> {
  const allowedTypes = new Set(['region', 'departement', 'country', 'city'])
  const clean = items
    .map((it) => ({
      zoneType: allowedTypes.has(String(it.zoneType || 'region')) ? String(it.zoneType || 'region') : 'region',
      zoneCode: String(it.zoneCode || '').trim().slice(0, 16),
      zoneLabel: String(it.zoneLabel || '').trim().slice(0, 96),
      position: Math.max(1, Math.min(20, Math.trunc(Number(it.position) || 1))),
      weight: Math.max(0, Math.min(100, Math.trunc(Number(it.weight ?? 50)))),
      reason: typeof it.reason === 'string' ? it.reason.slice(0, 4000) : '',
    }))
    .filter((it) => it.zoneCode && it.zoneLabel)
    .reduce((acc, it) => {
      if (acc.some((x) => x.position === it.position || (x.zoneType === it.zoneType && x.zoneCode === it.zoneCode))) return acc
      acc.push(it)
      return acc
    }, [] as Array<{ zoneType: string; zoneCode: string; zoneLabel: string; position: number; weight: number; reason: string }>)

  await usePocPg().execute(sql`
    DELETE FROM cs_main.cs_avatar_geographic_zone
     WHERE id_avatar_definition = ${idAvatar}
  `)
  for (const it of clean) {
    await usePocPg().execute(sql`
      INSERT INTO cs_main.cs_avatar_geographic_zone
        (id_avatar_definition, zone_type, zone_code, zone_label, position, weight, reason, date_add, date_upd)
      VALUES
        (${idAvatar}, ${it.zoneType}, ${it.zoneCode}, ${it.zoneLabel}, ${it.position}, ${it.weight}, ${it.reason}, NOW(), NOW())
    `)
  }
  return { ok: true, count: clean.length }
}
