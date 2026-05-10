/**
 *
 * POST /api/hub/translations/apply
 * Body : { scope, target_lang, translations: Array<{ id: rowKey, target: string }> }
 *
 * Supports individual scopes AND groups. For a group, each id
 * is decoded into (memberSlug, innerRowKey) and routed to the correct scope.
 */

import { useClientDb } from '~/server/utils/db'
import {
  findScope, findGroupScope, buildPsTranslationScope, decodeGroupRowKey,
  type ScopeSpec,
} from '~/server/utils/translate-scopes'

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/

interface TranslationIn { id: string; target: string }

function resolveScope(slug: string): ScopeSpec | null {
  let s: ScopeSpec | null = findScope(slug)
  if (!s && slug.startsWith('ps_translation:')) {
    s = buildPsTranslationScope(slug.slice('ps_translation:'.length))
  }
  return s
}

/**
 * Applies a unique translation to the passed scope, respecting the
 * defensive clientScope. Returns 'updated' | 'inserted' | 'skipped' | 'error'.
 */
async function applyOne(
  db: any,
  scope: ScopeSpec,
  innerRowKey: string,
  text: string,
  sourceLang: number,
  targetLang: number,
): Promise<'updated' | 'inserted' | 'skipped' | 'error'> {
  if (!IDENT.test(scope.table) || !IDENT.test(scope.column)) return 'error'
  for (const c of scope.idCols) if (!IDENT.test(c)) return 'error'

  // Branche ps_translation
  if (scope.table === 'ps_translation') {
    const [domain, ...keyParts] = innerRowKey.split('::')
    const key = keyParts.join('::')
    if (!domain || !key) return 'skipped'
    const existing = await db.get<any>(
      `SELECT id_translation FROM ps_translation WHERE id_lang = ? AND domain = ? AND \`key\` = ? LIMIT 1`,
      [targetLang, domain, key],
    )
    if (existing) {
      await db.run(
        `UPDATE ps_translation SET translation = ? WHERE id_translation = ?`,
        [text, existing.id_translation],
      )
      return 'updated'
    }
    await db.run(
      `INSERT INTO ps_translation (id_lang, domain, \`key\`, translation) VALUES (?, ?, ?, ?)`,
      [targetLang, domain, key, text],
    )
    return 'inserted'
  }

  // Branche _lang
  const parts = innerRowKey.split('::')
  if (parts.length !== scope.idCols.length) return 'skipped'
  const whereClauses = scope.idCols.map(c => `\`${c}\` = ?`).join(' AND ')

  // Guard tenant
  const cs = scope.clientScope
  if (cs) {
    let guardJoin = ` INNER JOIN \`${cs.masterTable}\` cs_master ON cs_master.\`${cs.masterIdCol}\` = src.\`${cs.masterIdCol}\``
    if (cs.parentTable && cs.parentIdCol) {
      guardJoin += ` INNER JOIN \`${cs.parentTable}\` cs_parent ON cs_parent.\`${cs.parentIdCol}\` = cs_master.\`${cs.parentIdCol}\``
    }
    const srcWhere = scope.idCols.map(c => `src.\`${c}\` = ?`).join(' AND ')
    const clientCol = cs.parentTable ? 'cs_parent.client_id' : 'cs_master.client_id'
    const guardRow = await db.get<any>(
      `SELECT 1 AS ok FROM \`${scope.table}\` src${guardJoin}
       WHERE ${srcWhere} AND ${clientCol} = ? LIMIT 1`,
      [...parts, db.clientId],
    )
    if (!guardRow) return 'skipped'
  }

  const existing = await db.get<any>(
    `SELECT 1 AS ok FROM \`${scope.table}\` WHERE id_lang = ? AND ${whereClauses} LIMIT 1`,
    [targetLang, ...parts],
  )
  if (existing) {
    await db.run(
      `UPDATE \`${scope.table}\` SET \`${scope.column}\` = ? WHERE id_lang = ? AND ${whereClauses}`,
      [text, targetLang, ...parts],
    )
    return 'updated'
  }
  if (!sourceLang) return 'skipped'

  // Copier toutes les colonnes depuis la ligne source, écraser id_lang + colonne cible
  const src = await db.get<any>(
    `SELECT * FROM \`${scope.table}\` WHERE id_lang = ? AND ${whereClauses} LIMIT 1`,
    [sourceLang, ...parts],
  )
  if (!src) return 'skipped'
  const copy: Record<string, any> = { ...src }
  copy.id_lang = targetLang
  copy[scope.column] = text
  const cols = Object.keys(copy)
  const placeholders = cols.map(() => '?').join(', ')
  await db.run(
    `INSERT INTO \`${scope.table}\` (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
    cols.map(c => copy[c]),
  )
  return 'inserted'
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as {
    scope?: string
    target_lang?: number
    source_lang?: number
    translations?: TranslationIn[]
  }

  const scopeSlug = String(body.scope || '')
  const targetLang = Number(body.target_lang) || 0
  const sourceLang = Number(body.source_lang) || 0
  const translations = Array.isArray(body.translations) ? body.translations : []

  if (!scopeSlug || !targetLang || !translations.length) {
    throw createError({ statusCode: 400, statusMessage: 'scope, target_lang, translations requis' })
  }

  const db = useClientDb(event)
  const group = findGroupScope(scopeSlug)
  const singleScope = group ? null : resolveScope(scopeSlug)
  if (!group && !singleScope) throw createError({ statusCode: 404, statusMessage: 'scope inconnu' })

  // Dédoublonnage : si le scope a dedupe='source', expande les traductions
  // vers tous les rowKeys siblings (rows master sharing le même source_text).
  // Ex: column_title='Informations' sur 6 liens → 1 traduction → 6 updates.
  let workingTranslations: TranslationIn[] = [...translations]
  if (singleScope?.dedupe === 'source' && sourceLang && singleScope.idCols.length === 1) {
    const col = singleScope.column
    const idCol = singleScope.idCols[0]
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col) && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(idCol)) {
      const expanded: TranslationIn[] = []
      const seen = new Set<string>()
      for (const it of translations) {
        const id = String(it.id || '')
        if (!id || seen.has(id)) continue
        seen.add(id)
        try {
          const srcRow = await db.get<any>(
            `SELECT \`${col}\` AS v FROM \`${singleScope.table}\` WHERE id_lang = ? AND \`${idCol}\` = ? LIMIT 1`,
            [sourceLang, id],
          )
          if (srcRow?.v === null || srcRow?.v === undefined || srcRow?.v === '') {
            expanded.push(it)
            continue
          }
          const siblings = await db.query<any>(
            `SELECT \`${idCol}\` AS sid FROM \`${singleScope.table}\` WHERE id_lang = ? AND \`${col}\` = ?`,
            [sourceLang, srcRow.v],
          )
          for (const s of siblings) {
            const sid = String(s.sid)
            if (!seen.has(sid)) {
              seen.add(sid)
              expanded.push({ id: sid, target: it.target })
            }
          }
          // L'original lui-même (déjà dans seen/expanded via siblings)
          if (!expanded.some(e => e.id === id)) expanded.push(it)
        } catch {
          expanded.push(it)
        }
      }
      workingTranslations = expanded
    }
  }

  let updated = 0
  let inserted = 0
  let skipped = 0
  const errors: Array<{ id: string; error: string }> = []

  for (const it of workingTranslations) {
    try {
      const id = String(it.id || '')
      const text = typeof it.target === 'string' ? it.target : ''
      if (!id) { skipped++; continue }

      let scope: ScopeSpec | null = singleScope
      let innerKey = id
      if (group) {
        const decoded = decodeGroupRowKey(id)
        if (!decoded) { skipped++; continue }
        scope = resolveScope(decoded.memberSlug)
        if (!scope || !group.members.includes(decoded.memberSlug) && !decoded.memberSlug.startsWith('ps_translation:')) {
          skipped++; continue
        }
        innerKey = decoded.innerRowKey
      }
      if (!scope) { skipped++; continue }

      const res = await applyOne(db, scope, innerKey, text, sourceLang, targetLang)
      if (res === 'updated') updated++
      else if (res === 'inserted') inserted++
      else if (res === 'skipped') skipped++
      else errors.push({ id, error: 'scope invalide' })
    } catch (e: any) {
      errors.push({ id: it.id, error: e?.message || 'unknown error' })
    }
  }

  return { updated, inserted, skipped, errors }
})
