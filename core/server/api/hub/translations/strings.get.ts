/**
 *
 * GET /api/hub/translations/strings?scope=X&source_lang=1&target_lang=2&filter=missing|all&limit=200
 *
 * If scope starts with 'group:' → resolve the members and concatenate the results
 * (rowKey prefixed by the memberSlug). Otherwise: classic single-scope logic.
 *
 * Security: `scope` is validated against a closed registry. No table/column name
 * is injected from a raw parameter.
 */

import { useClientDb } from '~/server/utils/db'
import {
  findScope, findGroupScope, buildPsTranslationScope,
  encodeGroupRowKey, type ScopeSpec,
} from '~/server/utils/translate-scopes'

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const scopeSlug = String(q.scope || '')
  const sourceLang = Number(q.source_lang) || 0
  const targetLang = Number(q.target_lang) || 0
  const filter = q.filter === 'all' ? 'all' : 'missing'
  const limit = Math.min(Math.max(Number(q.limit) || 200, 1), 2000)
  const search = String(q.search || '').trim()

  if (!scopeSlug || !sourceLang || !targetLang || sourceLang === targetLang) {
    throw createError({ statusCode: 400, statusMessage: 'scope, source_lang, target_lang requis (et distincts)' })
  }

  const db = useClientDb(event)

  // ── GROUP scope : délègue à chaque membre, préfixe les rowKeys ────────────
  const group = findGroupScope(scopeSlug)
  if (group) {
    let members = [...group.members]

    // Groupe dynamique : tous les domaines ps_translation matchant le préfixe
    if (group.dynamicPsTranslationPrefix) {
      try {
        const domains = await db.query<{ domain: string }>(
          `SELECT DISTINCT domain FROM ps_translation WHERE domain LIKE ? ORDER BY domain ASC`,
          [`${group.dynamicPsTranslationPrefix}%`],
        )
        members = [...members, ...domains.map(d => `ps_translation:${d.domain}`)]
      } catch { /* table absente */ }
    }

    const all: any[] = []
    let col = ''
    let idCols: string[] = []
    for (const mSlug of members) {
      if (all.length >= limit) break
      const remaining = limit - all.length
      const res = await fetchSingleScope(db, mSlug, sourceLang, targetLang, filter, search, remaining)
      if (!res) continue
      col = res.column
      idCols = res.idCols
      for (const r of res.rows) {
        all.push({
          ...r,
          rowKey: encodeGroupRowKey(mSlug, r.rowKey),
          label: `[${res.scopeLabel}] ${r.label}`,
        })
      }
    }

    return {
      scope: group.slug,
      column: col,
      idCols,
      rows: all,
      isGroup: true,
    }
  }

  // ── Single scope (comportement existant) ─────────────────────────────────
  const res = await fetchSingleScope(db, scopeSlug, sourceLang, targetLang, filter, search, limit)
  if (!res) throw createError({ statusCode: 404, statusMessage: 'scope inconnu' })
  return {
    scope: res.scopeSlug,
    column: res.column,
    idCols: res.idCols,
    rows: res.rows,
  }
})

interface ScopeResult {
  scopeSlug: string
  scopeLabel: string
  column: string
  idCols: string[]
  rows: Array<{ rowKey: string; label: string; source: string | null; target: string | null; hasTarget: boolean }>
}

/**
 * Fetch the rows for a unique scope (ps_translation:domain OR ps_<table>_lang:col).
 * Handles the ps_translation branch and the _lang branch with optional clientScope.
 * Returns null if the scope is unknown.
 */
async function fetchSingleScope(
  db: any,
  scopeSlug: string,
  sourceLang: number,
  targetLang: number,
  filter: 'missing' | 'all',
  search: string,
  limit: number,
): Promise<ScopeResult | null> {
  // Résolution du scope
  let scope: ScopeSpec | null = findScope(scopeSlug)
  if (!scope && scopeSlug.startsWith('ps_translation:')) {
    const domain = scopeSlug.slice('ps_translation:'.length)
    if (!/^[A-Za-z0-9_.\-]+$/.test(domain)) return null
    const exists = await db.get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ps_translation WHERE domain = ? LIMIT 1`,
      [domain],
    )
    if (!exists || exists.n === 0) return null
    scope = buildPsTranslationScope(domain)
  }
  if (!scope) return null

  if (!IDENT.test(scope.table) || !IDENT.test(scope.column)) return null
  for (const c of scope.idCols) {
    if (!IDENT.test(c)) return null
  }

  const t = scope.table
  const col = scope.column
  const idCols = scope.idCols

  // Branche ps_translation
  if (t === 'ps_translation') {
    if (!scope.domain) return null
    const rows = await db.query<any>(
      `SELECT
         src.id_translation  AS src_id,
         src.\`key\`         AS \`key\`,
         src.domain          AS domain,
         src.translation     AS source_text,
         tgt.id_translation  AS tgt_id,
         tgt.translation     AS target_text
       FROM ps_translation src
       LEFT JOIN ps_translation tgt
         ON tgt.domain = src.domain AND tgt.\`key\` = src.\`key\` AND tgt.id_lang = ?
       WHERE src.id_lang = ?
         AND src.domain = ?
         AND src.translation IS NOT NULL AND src.translation != ''
         ${filter === 'missing' ? `AND (tgt.id_translation IS NULL OR tgt.translation = '' OR tgt.translation = src.translation)` : ''}
         ${search ? `AND (src.\`key\` LIKE ? OR src.translation LIKE ?)` : ''}
       ORDER BY src.\`key\` ASC
       LIMIT ${limit}`,
      search
        ? [targetLang, sourceLang, scope.domain, `%${search}%`, `%${search}%`]
        : [targetLang, sourceLang, scope.domain],
    )

    return {
      scopeSlug: scope.slug,
      scopeLabel: scope.label,
      column: col,
      idCols: ['domain', 'key'],
      rows: rows.map((r: any) => ({
        rowKey: `${r.domain}::${r.key}`,
        label: r.key,
        source: r.source_text,
        target: r.target_text,
        hasTarget: !!r.tgt_id && r.target_text !== null && r.target_text !== '',
      })),
    }
  }

  // Branche _lang
  const onClause = idCols.map(c => `tgt.\`${c}\` = src.\`${c}\``).join(' AND ')
  const selectIdCols = idCols.map(c => `src.\`${c}\` AS \`${c}\``).join(', ')
  const whereSearch = search ? `AND src.\`${col}\` LIKE ?` : ''

  // Filtrage multi-tenant via INNER JOIN master (+ parent)
  let clientScopeJoin = ''
  let clientScopeWhere = ''
  const clientScopeParams: any[] = []
  if (scope.clientScope) {
    const cs = scope.clientScope
    if (!IDENT.test(cs.masterTable) || !IDENT.test(cs.masterIdCol)) return null
    clientScopeJoin += ` INNER JOIN \`${cs.masterTable}\` cs_master ON cs_master.\`${cs.masterIdCol}\` = src.\`${cs.masterIdCol}\``
    if (cs.parentTable && cs.parentIdCol) {
      if (!IDENT.test(cs.parentTable) || !IDENT.test(cs.parentIdCol)) return null
      clientScopeJoin += ` INNER JOIN \`${cs.parentTable}\` cs_parent ON cs_parent.\`${cs.parentIdCol}\` = cs_master.\`${cs.parentIdCol}\``
      clientScopeWhere = ` AND cs_parent.client_id = ?`
    } else {
      clientScopeWhere = ` AND cs_master.client_id = ?`
    }
    clientScopeParams.push(db.clientId)
  }

  const rows = await db.query<any>(
    `SELECT
       ${selectIdCols},
       src.\`${col}\`  AS source_text,
       tgt.\`${col}\`  AS target_text
     FROM \`${t}\` src
     ${clientScopeJoin}
     LEFT JOIN \`${t}\` tgt
       ON ${onClause} AND tgt.id_lang = ?
     WHERE src.id_lang = ?
       AND src.\`${col}\` IS NOT NULL AND src.\`${col}\` != ''
       ${clientScopeWhere}
       ${filter === 'missing' ? `AND (tgt.\`${col}\` IS NULL OR tgt.\`${col}\` = '' OR tgt.\`${col}\` = src.\`${col}\`)` : ''}
       ${whereSearch}
     ORDER BY ${idCols.map(c => `src.\`${c}\``).join(', ')} ASC
     LIMIT ${limit}`,
    search
      ? [targetLang, sourceLang, ...clientScopeParams, `%${search}%`]
      : [targetLang, sourceLang, ...clientScopeParams],
  )

  // Dédoublonnage par source_text si le scope le demande (ex: column_title
  // dupliqué sur chaque lien de cs_footer → on n'affiche qu'une seule
  // fois chaque source, l'apply propagera à tous les doublons).
  let mappedRows = rows.map((r: any) => {
    const key = idCols.map(c => String(r[c])).join('::')
    return {
      rowKey: key,
      label: idCols.map(c => `${c}=${r[c]}`).join(' · '),
      source: r.source_text,
      target: r.target_text,
      hasTarget: r.target_text !== null && r.target_text !== undefined && r.target_text !== '',
    }
  })

  if (scope.dedupe === 'source') {
    const seen = new Map<string, typeof mappedRows[0] & { _count: number }>()
    for (const r of mappedRows) {
      const key = String(r.source || '')
      const existing = seen.get(key)
      if (existing) {
        existing._count++
      } else {
        seen.set(key, { ...r, _count: 1 })
      }
    }
    mappedRows = [...seen.values()].map(r => ({
      ...r,
      label: r._count > 1 ? `${r.label} (×${r._count})` : r.label,
    }))
  }

  return {
    scopeSlug: scope.slug,
    scopeLabel: scope.label,
    column: col,
    idCols,
    rows: mappedRows,
  }
}
