/**
 *
 * POST /api/hub/translations/generate-prompt
 * Body : { scope, source_lang, target_lang, rowKeys: string[] }
 * Retourne { prompt: string, payload: Array<{rowKey, source}> }
 *
 * Supports individual scopes AND group scopes: for a group, each rowKey encodes the memberSlug; resolve each one on its scope.
 * each rowKey encodes the memberSlug; resolve each one on its scope.
 */

import { useClientDb } from '~/server/utils/db'
import {
  findScope, findGroupScope, buildPsTranslationScope, decodeGroupRowKey,
  type ScopeSpec,
} from '~/server/utils/translate-scopes'

interface Profile {
  id_lang: number
  iso_code: string
  profile: string
  tone: string
  culture_notes: string
  glossary: string | null
}

async function loadProfile(_db: any, idLang: number, event?: any): Promise<Profile | null> {
  const { getTranslateProfile } = await import('~/enterprise/misc/translate/server/utils/translate')
  const p = await getTranslateProfile(idLang, { event })
  if (!p) return null
  return {
    id_lang: p.idLang,
    iso_code: p.isoCode,
    profile: p.profile,
    tone: p.tone,
    culture_notes: p.cultureNotes,
    glossary: p.glossary,
  }
}

async function loadLang(db: any, idLang: number): Promise<{ iso_code: string; name: string } | null> {
  return db.get(`SELECT iso_code, name FROM ps_lang WHERE id_lang = ?`, [idLang])
}

function resolveScope(slug: string): ScopeSpec | null {
  let s: ScopeSpec | null = findScope(slug)
  if (!s && slug.startsWith('ps_translation:')) {
    s = buildPsTranslationScope(slug.slice('ps_translation:'.length))
  }
  return s
}

/** Charge le texte source d'une ligne pour un scope donné. */
async function loadSourceText(
  db: any,
  scope: ScopeSpec,
  innerRowKey: string,
  sourceLang: number,
): Promise<string | null> {
  if (scope.table === 'ps_translation') {
    const [domain, ...keyParts] = innerRowKey.split('::')
    const key = keyParts.join('::')
    const row = await db.get<any>(
      `SELECT translation FROM ps_translation WHERE id_lang = ? AND domain = ? AND \`key\` = ? LIMIT 1`,
      [sourceLang, domain, key],
    )
    return row?.translation ?? null
  }

  const parts = innerRowKey.split('::')
  if (parts.length !== scope.idCols.length) return null

  let clientJoin = ''
  let clientWhere = ''
  const clientParams: any[] = []
  if (scope.clientScope) {
    const cs = scope.clientScope
    clientJoin = ` INNER JOIN \`${cs.masterTable}\` cs_master ON cs_master.\`${cs.masterIdCol}\` = src.\`${cs.masterIdCol}\``
    if (cs.parentTable && cs.parentIdCol) {
      clientJoin += ` INNER JOIN \`${cs.parentTable}\` cs_parent ON cs_parent.\`${cs.parentIdCol}\` = cs_master.\`${cs.parentIdCol}\``
      clientWhere = ` AND cs_parent.client_id = ?`
    } else {
      clientWhere = ` AND cs_master.client_id = ?`
    }
    clientParams.push(db.clientId)
  }

  const whereClauses = scope.idCols.map(c => `src.\`${c}\` = ?`).join(' AND ')
  const row = await db.get<any>(
    `SELECT src.\`${scope.column}\` AS v FROM \`${scope.table}\` src${clientJoin}
     WHERE src.id_lang = ? AND ${whereClauses}${clientWhere} LIMIT 1`,
    [sourceLang, ...parts, ...clientParams],
  )
  return row?.v ?? null
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as {
    scope?: string
    source_lang?: number
    target_lang?: number
    rowKeys?: string[]
  }

  const scopeSlug = String(body.scope || '')
  const sourceLang = Number(body.source_lang) || 0
  const targetLang = Number(body.target_lang) || 0
  const rowKeys = Array.isArray(body.rowKeys) ? body.rowKeys.filter(k => typeof k === 'string') : []

  if (!scopeSlug || !sourceLang || !targetLang || !rowKeys.length) {
    throw createError({ statusCode: 400, statusMessage: 'scope, source_lang, target_lang, rowKeys requis' })
  }

  const db = useClientDb(event)

  const isGroup = !!findGroupScope(scopeSlug)
  let scopeLabel = scopeSlug

  // Load the source text for each rowKey.
  const payload: Array<{ rowKey: string; source: string; memberLabel?: string }> = []
  let anyHtml = false
  let anySlug = false

  if (isGroup) {
    const group = findGroupScope(scopeSlug)!
    scopeLabel = group.label
    for (const rk of rowKeys) {
      const decoded = decodeGroupRowKey(rk)
      if (!decoded) continue
      const memberScope = resolveScope(decoded.memberSlug)
      if (!memberScope) continue
      const src = await loadSourceText(db, memberScope, decoded.innerRowKey, sourceLang)
      if (src !== null) {
        payload.push({ rowKey: rk, source: src ?? '', memberLabel: memberScope.label })
        if (memberScope.html) anyHtml = true
        if (memberScope.column === 'link_rewrite') anySlug = true
      }
    }
  } else {
    const scope = resolveScope(scopeSlug)
    if (!scope) throw createError({ statusCode: 404, statusMessage: 'scope inconnu' })
    scopeLabel = scope.label
    if (scope.html) anyHtml = true
    if (scope.column === 'link_rewrite') anySlug = true
    for (const rk of rowKeys) {
      const src = await loadSourceText(db, scope, rk, sourceLang)
      if (src !== null) payload.push({ rowKey: rk, source: src ?? '' })
    }
  }

  if (!payload.length) {
    throw createError({ statusCode: 404, statusMessage: 'Aucune ligne source trouvée' })
  }

  const [srcLang, tgtLang, srcProfile, tgtProfile] = await Promise.all([
    loadLang(db, sourceLang),
    loadLang(db, targetLang),
    loadProfile(db, sourceLang, event),
    loadProfile(db, targetLang, event),
  ])

  const srcLabel = srcLang ? `${srcLang.name} (${srcLang.iso_code})` : `lang#${sourceLang}`
  const tgtLabel = tgtLang ? `${tgtLang.name} (${tgtLang.iso_code})` : `lang#${targetLang}`

  const profileBlock = tgtProfile
    ? `## Profil du marché cible — ${tgtLabel}

**Profil** : ${tgtProfile.profile}

**Ton de voix** : ${tgtProfile.tone}

**Spécificités culturelles** : ${tgtProfile.culture_notes}

${tgtProfile.glossary ? `**Glossaire terminologique** :\n\`\`\`json\n${tgtProfile.glossary}\n\`\`\`\n` : ''}`
    : `## Profil du marché cible — ${tgtLabel}

_(Aucun profil configuré — pense à définir le ton, la culture et les formats du marché ${tgtLabel} dans le panneau "Profils" du workspace.)_`

  const srcProfileBlock = srcProfile
    ? `## Profil source — ${srcLabel}

Contexte éditorial d'origine : ${srcProfile.profile}`
    : ''

  const htmlNotice = anyHtml
    ? '\n- **Conserve le HTML intact** pour les champs HTML (balises, attributs, classes). Traduis uniquement le contenu textuel entre les balises.'
    : ''
  const slugNotice = anySlug
    ? '\n- **Slug SEO** (champs `link_rewrite`) : uniquement minuscules, chiffres et tirets (`a-z0-9-`). Pas d\'accents, pas d\'espaces, pas de ponctuation.'
    : ''

  const itemsJson = JSON.stringify(
    payload.map(p => ({ id: p.rowKey, source: p.source, ...(p.memberLabel ? { scope: p.memberLabel } : {}) })),
    null,
    2,
  )

  const expectedJson = JSON.stringify(
    payload.slice(0, Math.min(2, payload.length)).map(p => ({ id: p.rowKey, target: '…' })),
    null,
    2,
  )

  const prompt = `Tu es un traducteur professionnel B2B expert en transcréation marketing et SEO.
Mission : traduire depuis **${srcLabel}** vers **${tgtLabel}** le contenu ci-dessous.
Scope technique : \`${scopeSlug}\` — ${scopeLabel}${isGroup ? ' (groupe : plusieurs champs/tables agrégés)' : ''}

${srcProfileBlock}

${profileBlock}

## Règles strictes
- Sortie **uniquement en JSON valide** (aucun texte avant ou après, aucun \`\`\`fence\`\`\`).
- Format de sortie : un **objet JSON** avec la clé \`translations\` contenant un tableau d'objets \`{ id, target }\`.
- **Préserve l'\`id\` exact** de chaque entrée source (c'est la clé de réinjection en base).
- Ne traduis pas les marques, noms propres, SKU, codes produits, URLs, emails.${htmlNotice}${slugNotice}
- Si une entrée est déjà correctement écrite dans la langue cible, recopie-la telle quelle.
- Reste fidèle au profil et au ton. Ne sur-localise pas : transcréation = adaptation, pas réécriture.

## Contenu source à traduire

\`\`\`json
${itemsJson}
\`\`\`

## Format de sortie attendu

\`\`\`json
{
  "translations": ${expectedJson}
}
\`\`\`

Retourne UNIQUEMENT le JSON final, prêt à être parsé.`

  return {
    prompt,
    payload: payload.map(p => ({ rowKey: p.rowKey, source: p.source })),
    meta: {
      scope: scopeSlug,
      isGroup,
      sourceLang,
      targetLang,
      sourceLabel: srcLabel,
      targetLabel: tgtLabel,
      hasTargetProfile: !!tgtProfile,
      rowCount: payload.length,
    },
  }
})
