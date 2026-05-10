/**
 *
 * Nitro Task — audit:sitemap-watch
 *
 * Wave 1A.4 of task #43 (python-nitro-tasks). Port of
 * `synedre/ac_sitemap_audit.py` (cron 07:30 UTC). Verifies the health of
 * sitemap public d'AC (codemyshop.com) :
 *   1. Index sitemap.xml accessible (HTTP 200)
 * 2. Each valid sub-sitemap (parsable, non-empty)
 * 3. Sample of 20 URLs in HEAD (no 404/500)
 * 4. Blog coverage: COUNT(ps_cms WHERE active=1) ≥ 90% of blog URLs
 * 5. Expected static pages present
 *
 * DB-only storage (no JSON FS file):
 *   - Rapport quotidien : INSERT cs_audit_reports (report_type='sitemap_audit')
 *   - Issues bloquant/majeur : INSERT cs_cicatrices (agent='seo-technique')
 * deduplicated by error_type+date for shadow ON+ON.
 */

import { defineTask } from 'nitropack/runtime'
import { skipIfNotAcInternal } from '~/server/utils/cron-context'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate, type AutomateLog } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'

const PG_SCHEMA   = 'cs_main'
const SITE_URL    = 'https://codemyshop.com'
const SITEMAP_IDX = `${SITE_URL}/sitemap.xml`
const USER_AGENT  = 'ac_sitemap_audit/2.0 (Nitro Task)'

const MAX_404_PERCENT      = 5
const MIN_BLOG_COVERAGE    = 90
const HEAD_SAMPLE_SIZE     = 20
const FETCH_TIMEOUT_MS     = 15_000

const EXPECTED_PAGES = [
  '/', '/blog', '/academy', '/equipe', '/agents-ia',
  '/modules', '/outils-ia', '/dictionnaire', '/reacteur',
  '/drill', '/manifeste', '/a-propos', '/contact',
  '/synedre/constitution', '/flywheel',
] as const

type Severity = 'BLOQUANT' | 'MAJEUR' | 'MINEUR'

interface Issue {
  severity: Severity
  msg: string
  detail?: Record<string, unknown>
}

interface AuditStats {
  sub_sitemaps?: number
  total_urls?: number
  per_sitemap?: Record<string, number>
  sample_size?: number
  sample_errors?: number
  db_articles?: number
  blog_sitemap_urls?: number
  blog_coverage_pct?: number
  expected_pages?: number
  missing_pages?: string[]
}

// ── HTTP avec timeout ──────────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { 'User-Agent': USER_AGENT, ...(init.headers ?? {}) },
    })
  } finally {
    clearTimeout(timer)
  }
}

// ── Extraction <loc> par regex (évite dep XML parser) ──────────────────────
//
// Le sitemap respecte `http://www.sitemaps.org/schemas/sitemap/0.9` — on
// extrait `<loc>...</loc>` dans urlset (URLs) ou sitemapindex (sub-sitemaps).
// Pas de besoin d'XML namespace-aware pour ce subset.

const LOC_RE = /<loc>\s*([^<]+?)\s*<\/loc>/gi

function extractLocs(xml: string): string[] {
  const out: string[] = []
  let m: RegExpExecArray | null
  LOC_RE.lastIndex = 0
  while ((m = LOC_RE.exec(xml)) !== null) {
    out.push(m[1].trim())
  }
  return out
}

async function fetchSitemap(url: string): Promise<{ urls: string[]; ok: boolean }> {
  try {
    const res = await fetchWithTimeout(url)
    if (!res.ok) return { urls: [], ok: false }
    const body = await res.text()
    return { urls: extractLocs(body), ok: true }
  } catch {
    return { urls: [], ok: false }
  }
}

async function headStatus(url: string): Promise<number> {
  try {
    const res = await fetchWithTimeout(url, { method: 'HEAD', timeoutMs: 10_000 })
    return res.status
  } catch {
    return 0
  }
}

// ── Sample sans biais (Fisher-Yates partiel) ───────────────────────────────

function randomSample<T>(arr: T[], n: number): T[] {
  const k = Math.min(n, arr.length)
  if (k === arr.length) return [...arr]
  const a = [...arr]
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(Math.random() * (a.length - i))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, k)
}

// ── Guard schema (skip silencieux côté tenants) ────────────────────────────

async function pgSchemaExists(schema: string): Promise<boolean> {
  const sql = getPgClient()
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schema}
    ) AS exists
  `
  return Boolean(rows[0]?.exists)
}

// ── Compteur articles blog actifs (DB) ─────────────────────────────────────

async function countActiveCmsArticles(): Promise<number> {
  try {
    const sql = getPgClient()
    const rows = await sql<{ n: number }[]>`
      SELECT COUNT(*)::int AS n
      FROM ${sql(PG_SCHEMA)}.ps_cms
      WHERE active = 1
    `
    return rows[0]?.n ?? -1
  } catch {
    return -1
  }
}

// ── Étapes audit ───────────────────────────────────────────────────────────

interface AuditOutcome {
  stats: AuditStats
  issues: Issue[]
}

async function runAudit(log: AutomateLog): Promise<AuditOutcome> {
  const stats: AuditStats = {}
  const issues: Issue[] = []

  // 1. Index sitemap
  const t1 = Date.now()
  const indexRes = await fetchSitemap(SITEMAP_IDX)
  if (!indexRes.ok) {
    issues.push({ severity: 'BLOQUANT', msg: 'sitemap.xml inaccessible ou invalide' })
    log.step('fetch_index', 'error', 'sitemap.xml inaccessible', Date.now() - t1)
    return { stats, issues }
  }
  const subSitemaps = indexRes.urls
  stats.sub_sitemaps = subSitemaps.length
  log.step('fetch_index', 'ok', `${subSitemaps.length} sous-sitemaps`, Date.now() - t1)

  // 2. Sous-sitemaps
  const t2 = Date.now()
  const allUrls: string[] = []
  const perSitemap: Record<string, number> = {}
  for (const url of subSitemaps) {
    const name = url.split('/').pop() ?? url
    const sub = await fetchSitemap(url)
    if (!sub.ok) {
      issues.push({ severity: 'MAJEUR', msg: `${name} inaccessible ou invalide` })
      continue
    }
    perSitemap[name] = sub.urls.length
    allUrls.push(...sub.urls)
    if (sub.urls.length === 0) {
      issues.push({ severity: 'MAJEUR', msg: `${name} est vide (0 URLs)` })
    }
  }
  stats.total_urls = allUrls.length
  stats.per_sitemap = perSitemap
  log.step('fetch_subs', 'ok', `${allUrls.length} URLs cumulées`, Date.now() - t2)

  // 3. HEAD check sample
  const t3 = Date.now()
  const sample = randomSample(allUrls, HEAD_SAMPLE_SIZE)
  const headResults = await Promise.all(sample.map((u) => headStatus(u)))
  const errs = headResults.filter((s) => s !== 200)
  stats.sample_size = sample.length
  stats.sample_errors = errs.length
  if (sample.length > 0) {
    const errPct = (errs.length / sample.length) * 100
    if (errPct > MAX_404_PERCENT) {
      issues.push({
        severity: 'MAJEUR',
        msg: `${errPct.toFixed(0)}% des URLs en erreur (${errs.length}/${sample.length})`,
      })
    }
  }
  log.step('head_sample', 'ok',
    `${sample.length - errs.length}/${sample.length} OK`, Date.now() - t3)

  // 4. Couverture blog
  const t4 = Date.now()
  const dbCount = await countActiveCmsArticles()
  const blogSitemapCount = perSitemap['sitemap-blog.xml'] ?? 0
  if (dbCount > 0) {
    const coverage = (blogSitemapCount / dbCount) * 100
    stats.db_articles = dbCount
    stats.blog_sitemap_urls = blogSitemapCount
    stats.blog_coverage_pct = Math.round(coverage * 10) / 10
    if (coverage < MIN_BLOG_COVERAGE) {
      const missing = dbCount - blogSitemapCount
      issues.push({
        severity: 'MAJEUR',
        msg: `Sitemap blog incomplet : ${blogSitemapCount}/${dbCount} (${coverage.toFixed(0)}%), ${missing} manquants`,
      })
    }
  }
  log.step('coverage', dbCount > 0 ? 'ok' : 'warning',
    `db=${dbCount} sitemap=${blogSitemapCount}`, Date.now() - t4)

  // 5. Pages statiques attendues
  const t5 = Date.now()
  const urlSet = new Set(allUrls)
  const missingPages: string[] = []
  for (const page of EXPECTED_PAGES) {
    const full = `${SITE_URL}${page}`
    if (!urlSet.has(full) && !urlSet.has(`${full}/`)) {
      missingPages.push(page)
    }
  }
  stats.expected_pages = EXPECTED_PAGES.length
  stats.missing_pages = missingPages
  if (missingPages.length > 0) {
    issues.push({
      severity: 'MINEUR',
      msg: `${missingPages.length} pages statiques absentes du sitemap`,
      detail: { pages: missingPages },
    })
  }
  log.step('expected_pages', 'ok',
    `${EXPECTED_PAGES.length - missingPages.length}/${EXPECTED_PAGES.length} présentes`,
    Date.now() - t5)

  return { stats, issues }
}

// ── Persistance DB-only ────────────────────────────────────────────────────

async function persistReport(stats: AuditStats, issues: Issue[]): Promise<void> {
  const sql = getPgClient()
  const summary = issues.length === 0
    ? 'SITEMAP PROPRE — aucun problème'
    : `${issues.length} issue(s) : ${issues.filter(i => i.severity === 'BLOQUANT').length} bloquant, ${issues.filter(i => i.severity === 'MAJEUR').length} majeur, ${issues.filter(i => i.severity === 'MINEUR').length} mineur`

  const dataJson = JSON.stringify({
    date: new Date().toISOString(),
    stats,
    issues,
    bloquant: issues.filter(i => i.severity === 'BLOQUANT').length,
    majeur:   issues.filter(i => i.severity === 'MAJEUR').length,
    mineur:   issues.filter(i => i.severity === 'MINEUR').length,
  })

  // Idempotent : 1 row par (report_type, report_date) → upsert manuel
  // (la table n'a pas de contrainte UNIQUE, on dédup via DELETE pré-INSERT).
  await sql`
    DELETE FROM ${sql(PG_SCHEMA)}.cs_audit_reports
    WHERE report_type = 'sitemap_audit' AND report_date = CURRENT_DATE
  `
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_audit_reports
      (report_type, report_date, data_json, summary, date_add)
    VALUES
      ('sitemap_audit', CURRENT_DATE, ${dataJson}, ${summary}, NOW())
  `
}

async function persistCicatriceIfNeeded(issues: Issue[], log: AutomateLog): Promise<void> {
  const blocking = issues.filter(i => i.severity === 'BLOQUANT' || i.severity === 'MAJEUR')
  if (blocking.length === 0) return

  const sql = getPgClient()
  const bloquant = issues.filter(i => i.severity === 'BLOQUANT').length
  const majeur   = issues.filter(i => i.severity === 'MAJEUR').length
  // cs_cicatrices.error_type = VARCHAR(11) — taxonomie courte. Dédup
  // jour-par-jour via date_add::date plutôt que d'enchâsser la date dans le
  // type (cf. backlog : élargir à VARCHAR(64) cohérent hub.ts).
  const errorType = 'sitemap'
  const description = `Sitemap audit ${new Date().toISOString().slice(0, 10)} — ${bloquant} bloquant(s), ${majeur} majeur(s)`
  const rootCause = blocking.slice(0, 3).map(i => i.msg).join('; ').slice(0, 300)
  const severity  = bloquant > 0 ? 'critique' : 'haute'

  const exists = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n
    FROM ${sql(PG_SCHEMA)}.cs_cicatrices
    WHERE error_type = ${errorType}
      AND date_add::date = CURRENT_DATE
  `
  if ((exists[0]?.n ?? 0) > 0) {
    log.step('cicatrice_dedup', 'skip', `incidents du jour déjà gravée`)
    return
  }

  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_cicatrices
      (agent_codename, error_type, description, root_cause, severity, resolved, date_add)
    VALUES
      ('seo-technique', ${errorType}, ${description}, ${rootCause}, ${severity}, 0, NOW())
  `
  log.step('cicatrice_logged', 'ok', `severity=${severity}`)
}

// ── Nitro Task entrypoint ──────────────────────────────────────────────────

export default defineTask({
  meta: {
    name: 'audit:sitemap-watch',
    description: 'Audit quotidien sitemap public AC (port ac_sitemap_audit, Wave 1A.4)',
  },
  async run() {
    const skip = skipIfNotAcInternal('audit:sitemap-watch')
    if (skip) return skip
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock('ac_sitemap_audit', async () => {
      return runAutomate('ac_sitemap_audit', async (log) => {
        const { stats, issues } = await runAudit(log)
        log.count('issues_total', issues.length)
        log.count('issues_bloquant', issues.filter(i => i.severity === 'BLOQUANT').length)
        log.count('issues_majeur',   issues.filter(i => i.severity === 'MAJEUR').length)
        log.count('issues_mineur',   issues.filter(i => i.severity === 'MINEUR').length)

        await persistReport(stats, issues)
        await persistCicatriceIfNeeded(issues, log)

        const summary = issues.length === 0
          ? 'sitemap propre'
          : `${issues.length} issue(s)`
        log.setResult(issues.length === 0 ? 'ok' : 'partial', summary)
        return {
          status: issues.length === 0 ? 'ok' : 'partial',
          issues: issues.length,
          stats,
        }
      })
    })

    if (!lockResult.acquired) {
      return { result: { status: 'skipped', reason: 'lock-held-by-other-instance' } }
    }
    return { result: lockResult.result }
  },
})
