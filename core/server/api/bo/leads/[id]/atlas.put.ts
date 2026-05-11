

import { useClientDb } from '~/server/utils/db'

const ALLOWED_VERTICAL = new Set([
  'bacchus', 'ceres', 'poseidon', 'hephaistos', 'hermes',
  'hors-cible', 'a-classer',
])
const ALLOWED_TIER = new Set(['t1', 't2', 't3', 'veille', 'ecarte', 'a-classer'])
const ALLOWED_STATUS = new Set([
  'nouveau', 'qualifie', 'veille', 'pret-contact', 'ecarte',
])
const ALLOWED_RISK = new Set([
  'aucun', 'voisin-example-shop', 'client-aude-connu', 'client-ac-connu',
])

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }
  const body = await readBody(event) as Record<string, any>

  const sets: string[] = []
  const params: any[] = []

  if (typeof body.verticalTarget === 'string' && ALLOWED_VERTICAL.has(body.verticalTarget)) {
    sets.push(`vertical_target = ?`); params.push(body.verticalTarget)
  }
  if (typeof body.tier === 'string' && ALLOWED_TIER.has(body.tier)) {
    sets.push(`tier = ?`); params.push(body.tier)
  }
  if (typeof body.atlasStatus === 'string' && ALLOWED_STATUS.has(body.atlasStatus)) {
    sets.push(`atlas_status = ?`); params.push(body.atlasStatus)
  }
  if (typeof body.relationalRisk === 'string' && ALLOWED_RISK.has(body.relationalRisk)) {
    sets.push(`relational_risk = ?`); params.push(body.relationalRisk)
  }
  if (typeof body.notesAtlas === 'string') {
    sets.push(`notes_atlas = ?`); params.push(body.notesAtlas.slice(0, 4000))
  }
  if (typeof body.signalScore === 'number'
      && body.signalScore >= 0 && body.signalScore <= 100) {
    sets.push(`signal_score = ?`); params.push(Math.trunc(body.signalScore))
  }

  if (sets.length === 0) {
    return { ok: false, reason: 'no-valid-fields' }
  }
  sets.push(`date_upd = CURRENT_TIMESTAMP`)

  const db = useClientDb(event)
  try {
    const sql = `UPDATE cs_main.cs_smartlead_rungis
                    SET ${sets.join(', ')}
                  WHERE id_ac_smartlead = ?`
    await db.query<any>(sql, [...params, id])
    return { ok: true, id }
  } catch (err: any) {
    console.error('[bo/leads/atlas] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'DB error' })
  }
})
