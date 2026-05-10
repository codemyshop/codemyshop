/**
 *
 * Nitro Task — audit:dictionary-watch
 *
 * Wave 1A.6 of work #43 (python-nitro-tasks). Port of
 * `synedre/ac_dictionary_watch.py` (cron quotidien 20:00 UTC).
 * Detects concepts used in blog articles (ps_cms_lang)
 * that are neither in the dictionary (cs_dictionary) nor in the names
 * of agents (cs_agents) nor in the glossary (cs_academy_module).
 *
 * Stockage DB-only : INSERT idempotent cs_audit_reports
 * (report_type='dictionary_watch', 1 row/jour).
 */

import { defineTask } from 'nitropack/runtime'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate, type AutomateLog } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'
import { skipIfNotAcInternal } from '~/server/utils/cron-context'

const PG_SCHEMA = 'cs_main'
const TOP_KEEP  = 50          // Nb de concepts manquants persistés
const MIN_SCORE = 3           // Seuil pondéré (occurrences * weight)
const SCAN_TOP_N = 200        // Counter.most_common(200) côté Python

// ── Stop words (parité 1:1 avec ac_dictionary_watch.py) ─────────────────

const STOP_WORDS: ReadonlySet<string> = new Set([
  // Français — déterminants, pronoms, conjonctions, adverbes courants
  'dans', 'pour', 'avec', 'plus', 'cette', 'sont', 'fait', 'tout', 'être',
  'faire', 'comme', 'peut', 'aussi', 'même', 'entre', 'autre', 'après',
  'avant', 'sans', 'sous', 'vers', 'chez', 'donc', 'mais', 'puis',
  'très', 'bien', 'quand', 'nous', 'vous', 'leur', 'notre', 'votre',
  'chaque', 'comment', 'pourquoi', 'combien', 'quelle', 'quels', 'quelles',
  'voici', 'voilà', 'jamais', 'toujours', 'encore', 'souvent', 'parfois',
  'trois', 'quatre', 'cinq', 'premier', 'première', 'dernière', 'dernier',
  'avoir', 'tous', 'toutes', 'depuis', 'pendant',
  'alors', 'parce', 'ainsi', 'cependant', 'pourtant', 'quelques',
  // Français — mots de contenu trop génériques
  'article', 'articles', 'page', 'pages', 'site', 'sites',
  'client', 'clients', 'agent', 'agents', 'module', 'modules',
  'code', 'codes', 'données', 'système', 'systèmes',
  'contenu', 'contenus', 'produit', 'produits', 'service', 'services',
  'questions', 'réponse', 'réponses', 'conclusion', 'sources', 'source',
  'définition', 'exemple', 'exemples', 'résultat', 'résultats',
  'approfondir', 'fréquentes', 'critiques', 'critique',
  'erreur', 'erreurs', 'problème', 'problèmes', 'solution', 'solutions',
  'action', 'actions', 'phase', 'phases', 'étape', 'étapes',
  'propre', 'change', 'point', 'points', 'partie', 'parties',
  'france', 'français', 'française', 'google', 'amazon',
  'production', 'stratégie', 'architecture', 'marque',
  'média', 'médias', 'boutique', 'boutiques',
  'aucun', 'aucune', 'faible', 'faibles', 'documentation',
  'états', 'état', 'public', 'publique', 'publics', 'publiques',
  'compose', 'search', 'central', 'console',
  'intelligence', 'carette', 'alexandre', 'alexandre carette',
  'approfondir dans l\'academy', 'approfondir dans l’academy',
  'combien de temps', 'sources et références',
  'attention', 'selon', 'déployer', 'réservez', 'réserve',
  'product', 'schema', 'build', 'vitals',
  'critère', 'critères', 'océan',
  'staff', 'impact', 'europe', 'chief',
  'mémoire', 'sécurité', 'désir', 'moyenne', 'validation',
  'réserver', 'indexing', 'encrypt', 'audit', 'pipeline',
  'optimization', 'souverain',
  'claude', 'python', 'gemini', 'anthropic', 'vercel',
  'googlebot', 'harcourt', 'matomo', 'google ads',
  // Anglais
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'been',
  'first', 'about', 'their', 'which', 'would', 'there', 'other',
])

// ── Guard schema ────────────────────────────────────────────────────────

async function pgSchemaExists(schema: string): Promise<boolean> {
  const sql = getPgClient()
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schema}
    ) AS exists
  `
  return Boolean(rows[0]?.exists)
}

// ── Helpers ─────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text.replace(/[‘’]/g, "'").trim().toLowerCase()
}

function cleanPhrase(phrase: string): string {
  return phrase.trim().replace(/^[\s.,;:!?«»"'—–\-()[\]]+|[\s.,;:!?«»"'—–\-()[\]]+$/g, '').trim()
}

function isNoise(term: string): boolean {
  if (!term || term.length < 4) return true
  const norm = normalize(term)
  if (STOP_WORDS.has(norm)) return true
  const words = norm.split(/\s+/)
  if (words.every((w) => STOP_WORDS.has(w))) return true
  const cleaned = norm.replace(/[^a-zà-ÿ\s\-]/g, '').trim()
  if (cleaned.length < 4) return true
  return false
}

// ── Loaders DB ──────────────────────────────────────────────────────────

async function loadDictionary(): Promise<{ slugs: Set<string>; words: Set<string>; size: number }> {
  const sql = getPgClient()
  const rows = await sql<{ slug: string; word: string }[]>`
    SELECT slug, word FROM ${sql(PG_SCHEMA)}.cs_dictionary
  `
  const slugs = new Set<string>()
  const words = new Set<string>()
  for (const r of rows) {
    if (r.slug) slugs.add(r.slug)
    if (r.word) words.add(r.word.toLowerCase())
  }
  return { slugs, words, size: rows.length }
}

async function loadAgentNames(): Promise<Set<string>> {
  const sql = getPgClient()
  const rows = await sql<{ codename: string | null; nickname: string | null }[]>`
    SELECT codename, nickname FROM ${sql(PG_SCHEMA)}.cs_agents
  `
  const names = new Set<string>()
  for (const r of rows) {
    if (r.codename) names.add(r.codename.toLowerCase())
    if (r.nickname) names.add(r.nickname.toLowerCase())
  }
  return names
}

async function loadAcademyTerms(): Promise<Set<string>> {
  const sql = getPgClient()
  const rows = await sql<{ title: string | null; slug: string | null }[]>`
    SELECT title, slug FROM ${sql(PG_SCHEMA)}.cs_academy_module
  `
  const terms = new Set<string>()
  const titleRe = /\b[A-ZÀ-Ü][a-zà-ü]{3,}\b/gu
  for (const r of rows) {
    if (r.title) {
      for (const m of r.title.matchAll(titleRe)) terms.add(m[0].toLowerCase())
    }
    if (r.slug) {
      for (const part of r.slug.split('-')) {
        if (part.length > 4) terms.add(part.toLowerCase())
      }
    }
  }
  return terms
}

async function loadBlogContent(): Promise<string> {
  const sql = getPgClient()
  // Schema canonique PG : ps_cms_lang (id_lang = 1 = FR)
  // Parité Python : agrège meta_title + content avec \t entre cols, \n entre rows
  const rows = await sql<{ meta_title: string | null; content: string | null }[]>`
    SELECT meta_title, content FROM ${sql(PG_SCHEMA)}.ps_cms_lang
    WHERE id_lang = 1 AND content <> ''
  `
  return rows.map((r) => `${r.meta_title ?? ''}\t${r.content ?? ''}`).join('\n')
}

// ── Extraction concepts (parité regex Python) ───────────────────────────

const STRONG_RE   = /<strong>([^<]+)<\/strong>/gi
const H2_RE       = /<h2[^>]*>([^<]+)<\/h2>/gi
const COMPOUND_RE = /\b([A-ZÀ-Ü][a-zà-ÿ]{2,}(?:\s(?:de|des|du|d'|la|le|les|l'|en|et|à)\s[A-ZÀ-Üa-zà-ÿ][a-zà-ÿ]{2,})*(?:\s[A-ZÀ-Ü][a-zà-ÿ]{2,})*)\b/gu
const CAPITAL_RE  = /\b([A-ZÀ-Ü][a-zà-ÿ]{4,})\b/gu

function extractConcepts(text: string): Map<string, number> {
  const concepts = new Map<string, number>()
  const bump = (key: string, weight: number) => {
    concepts.set(key, (concepts.get(key) ?? 0) + weight)
  }

  // 1. <strong> = poids 3
  for (const m of text.matchAll(STRONG_RE)) {
    const phrase = cleanPhrase(m[1])
    if (phrase && !isNoise(phrase)) bump(phrase.toLowerCase(), 3)
  }

  // 2. <h2> = poids 2
  for (const m of text.matchAll(H2_RE)) {
    const phrase = cleanPhrase(m[1])
    if (phrase && !isNoise(phrase)) bump(phrase.toLowerCase(), 2)
  }

  // 3. Compound capitalisé (2-4 mots avec liaisons)
  for (const m of text.matchAll(COMPOUND_RE)) {
    const phrase = cleanPhrase(m[1])
    const words = phrase.split(/\s+/)
    if (words.length >= 2 && !isNoise(phrase)) bump(phrase.toLowerCase(), 2)
    else if (words.length === 1 && phrase.length >= 5 && !isNoise(phrase)) bump(phrase.toLowerCase(), 1)
  }

  // 4. Mots capitalisés isolés
  for (const m of text.matchAll(CAPITAL_RE)) {
    const cleaned = m[1].trim().toLowerCase()
    if (!isNoise(cleaned)) bump(cleaned, 1)
  }

  return concepts
}

// ── Audit ───────────────────────────────────────────────────────────────

interface MissingConcept { concept: string; score: number; in_academy: boolean }

interface AuditOutcome {
  dictionary_size: number
  blog_chars: number
  scanned_concepts: number
  missing: MissingConcept[]
  summary: string
}

async function runAudit(log: AutomateLog): Promise<AuditOutcome> {
  const t0 = Date.now()

  const dict = await loadDictionary()
  log.step('load_dictionary', 'ok', `${dict.size} termes`, Date.now() - t0)

  const t1 = Date.now()
  const agentNames = await loadAgentNames()
  log.step('load_agents', 'ok', `${agentNames.size} noms`, Date.now() - t1)

  const t2 = Date.now()
  const academyTerms = await loadAcademyTerms()
  log.step('load_academy', 'ok', `${academyTerms.size} termes`, Date.now() - t2)

  const t3 = Date.now()
  const blob = await loadBlogContent()
  log.step('load_blog', 'ok', `${blob.length} chars`, Date.now() - t3)

  if (!blob) {
    return {
      dictionary_size: dict.size, blog_chars: 0, scanned_concepts: 0,
      missing: [], summary: 'Aucun contenu blog récupéré',
    }
  }

  const t4 = Date.now()
  const concepts = extractConcepts(blob)
  log.step('extract_concepts', 'ok', `${concepts.size} concepts bruts`, Date.now() - t4)

  // Fuzzy match parts (parité dict_words_parts Python)
  const dictWordsParts = new Set<string>(dict.words)
  for (const w of dict.words) {
    for (const part of w.split(/\s+/)) {
      if (part.length >= 4) dictWordsParts.add(part)
    }
  }

  // Counter.most_common(200) → top SCAN_TOP_N par score décroissant
  const top = [...concepts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, SCAN_TOP_N)

  const missing: MissingConcept[] = []
  for (const [concept, count] of top) {
    const norm = normalize(concept)
    const slug = norm.replace(/\s+/g, '-').replace(/'/g, '-')
    if (dict.slugs.has(slug)) continue
    if (dictWordsParts.has(norm)) continue
    if (agentNames.has(norm)) continue
    if (STOP_WORDS.has(norm)) continue
    // Substring match : si le concept est inclus dans un mot du dico
    let isSubstring = false
    for (const w of dict.words) {
      if (w.includes(norm)) { isSubstring = true; break }
    }
    if (isSubstring) continue
    if (count >= MIN_SCORE) {
      missing.push({ concept, score: count, in_academy: academyTerms.has(concept) })
    }
  }

  missing.sort((a, b) => b.score - a.score)
  const trimmed = missing.slice(0, TOP_KEEP)

  log.count('dictionary_size', dict.size)
  log.count('concepts_scanned', concepts.size)
  log.count('concepts_missing', missing.length)

  const summary = missing.length === 0
    ? `Dictionnaire complet (${dict.size} termes, ${concepts.size} concepts scannés)`
    : `${missing.length} terme(s) manquant(s) sur ${concepts.size} scannés (dico ${dict.size} termes)`

  return {
    dictionary_size: dict.size,
    blog_chars: blob.length,
    scanned_concepts: concepts.size,
    missing: trimmed,
    summary,
  }
}

// ── Persistance DB-only ─────────────────────────────────────────────────

async function persistReport(outcome: AuditOutcome): Promise<void> {
  const sql = getPgClient()
  const dataJson = JSON.stringify({
    date: new Date().toISOString(),
    dictionary_size: outcome.dictionary_size,
    blog_chars: outcome.blog_chars,
    scanned_concepts: outcome.scanned_concepts,
    missing_count: outcome.missing.length,
    missing: outcome.missing,
  })

  await sql`
    DELETE FROM ${sql(PG_SCHEMA)}.cs_audit_reports
    WHERE report_type = 'dictionary_watch' AND report_date = CURRENT_DATE
  `
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_audit_reports
      (report_type, report_date, data_json, summary, date_add)
    VALUES
      ('dictionary_watch', CURRENT_DATE, ${dataJson}, ${outcome.summary.slice(0, 500)}, NOW())
  `
}

// ── Nitro Task entrypoint ───────────────────────────────────────────────

export default defineTask({
  meta: {
    name: 'audit:dictionary-watch',
    description: 'Détecte concepts blog absents du dictionnaire (port ac_dictionary_watch, Wave 1A.6)',
  },
  async run() {
    const skip = skipIfNotAcInternal('audit:dictionary-watch')
    if (skip) return { result: skip }
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock('ac_dictionary_watch', async () => {
      return runAutomate('ac_dictionary_watch', async (log) => {
        const outcome = await runAudit(log)
        await persistReport(outcome)
        const status = outcome.missing.length === 0 ? 'ok' : 'partial'
        log.setResult(status, outcome.summary)
        return { status, ...outcome }
      })
    })

    if (!lockResult.acquired) {
      return { result: { status: 'skipped', reason: 'lock-held-by-other-instance' } }
    }
    return { result: lockResult.result }
  },
})
