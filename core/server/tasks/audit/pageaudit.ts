/**
 *
 * Nitro Task — audit:pageaudit
 *
 * Wave 1 active #2 of task #43. Port of `ac_pageaudit.py`
 * (cron quotidien 07:55 UTC, 882 lignes Python).
 *
 * For each blog article + each static page:
 *   1. HTTP 200
 * 2. Cover present (articles)
 * 3. Dates in cs_cms_extra (articles)
 * 4. JSON-LD (Article + BreadcrumbList required on articles)
 *   5. <title> ≤ 60 chars
 *   6. <meta description> ≤ 160 chars
 * 7. ≥ 2 internal links mapped (read from cs_crosslinks DB-only)
 *   8. Slug 3 segments (articles)
 *   9. FAQ ≥ 15 questions (articles)
 *
 * Execution mode controlled by AUDIT_MODE:
 * - 'shadow' (default): complete audit, report persisted, ZERO writes.
 * Python cron remains source of truth.
 * - 'active'           : applies native DB fixes (dates, newlines
 * escaped, apostrophes, HTML in <dd>). The
 * Python cron must be disabled in parallel.
 *
 * NB Wave 2: auto-fixes that required a Python subprocess
 * (`ac_coverinject` for missing covers, `ac_linkmap` + `ac_linkinject`
 * for internal links) are SKIPPED — left to the Python cron until
 * complete TypeScript port of these two components.
 *
 * Stockage DB-only : INSERT idempotent cs_audit_reports
 * (report_type='pageaudit', 1 row/jour).
 */

import { defineTask } from 'nitropack/runtime'
import { skipIfNotAcInternal } from '~/server/utils/cron-context'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate, type AutomateLog } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'
import { getAuditMode, type AuditMode } from '~/server/utils/audit-mode'

const PG_SCHEMA = 'cs_main'
const AUTOMATE_KEY = 'ac_pageaudit'
const NUXT_INTERNAL = 'http://127.0.0.1:3000'

const AC_STATIC_PAGES: readonly string[] = [
  '/', '/blog', '/equipe', '/offre-starter', '/expertise',
  '/academy', '/dictionnaire', '/modules', '/outils-ia',
  '/flywheel', '/reacteur', '/a-propos', '/ambassadeur',
  '/manifeste', '/contact', '/mentions-legales', '/confidentialite',
  '/conditions-utilisation', '/livraison', '/paiement-securise',
]

// ── Types ───────────────────────────────────────────────────────────────

type CheckStatus = 'ok' | 'warn' | 'error' | 'fixed'
interface Check { name: string; status: CheckStatus; detail: string }
interface PageResult {
  url: string
  page_type: 'article' | 'static'
  article_id: number
  checks: Check[]
}

interface Article {
  id: number
  nuxtUrl: string
  coverImage: string | null
  linkRewrite: string
  category: string | null
  subcategory: string | null
  slug: string | null
}

interface CmsExtra {
  date_published: string
  date_updated: string
  image: string
}

interface CrosslinkEntry {
  same_subcat: number
  same_pillar: number
  cross_pillar: number
}

// ── Guard schema + utils ────────────────────────────────────────────────

async function pgSchemaExists(schema: string): Promise<boolean> {
  const sql = getPgClient()
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schema}
    ) AS exists
  `
  return Boolean(rows[0]?.exists)
}

async function httpGet(url: string, timeoutMs = 15000): Promise<{ status: number; body: string }> {
  const ctrl = new AbortController()
  const tid = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'audit:pageaudit/1.0' },
    })
    const body = await r.text()
    return { status: r.status, body }
  } catch {
    return { status: 0, body: '' }
  } finally {
    clearTimeout(tid)
  }
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? m[1].trim() : ''
}

function extractMetaDescription(html: string): string {
  const m1 = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
  if (m1) return m1[1].trim()
  const m2 = html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)
  return m2 ? m2[1].trim() : ''
}

function extractJsonLdTypes(html: string): Set<string> {
  const types = new Set<string>()
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1])
      const collect = (obj: any) => {
        const t = obj?.['@type']
        if (Array.isArray(t)) t.forEach((x) => types.add(String(x)))
        else if (t) types.add(String(t))
        const graph = obj?.['@graph']
        if (Array.isArray(graph)) graph.forEach(collect)
      }
      if (Array.isArray(data)) data.forEach(collect)
      else collect(data)
    } catch {
      // bloc JSON-LD invalide — ignoré (parité Python)
    }
  }
  types.delete('')
  return types
}

function countFaq(html: string): number {
  // Méthode 1 : JSON-LD FAQPage.mainEntity.length
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1])
      const faq = Array.isArray(data?.['@graph'])
        ? data['@graph'].find((x: any) => x?.['@type'] === 'FAQPage')
        : (data?.['@type'] === 'FAQPage' ? data : null)
      if (faq && Array.isArray(faq.mainEntity)) return faq.mainEntity.length
    } catch { /* skip */ }
  }
  // Method 2: <dt> count
  return (html.match(/<dt[^>]*>/g) || []).length
}

// ── Loaders DB / API ────────────────────────────────────────────────────

async function fetchArticles(): Promise<Article[]> {
  const { status, body } = await httpGet(`${NUXT_INTERNAL}/api/cms?limit=200`)
  if (status !== 200) return []
  try {
    const data = JSON.parse(body)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function loadCmsExtras(): Promise<Map<number, CmsExtra>> {
  const sql = getPgClient()
  const rows = await sql<{
    id_cms: number
    date_published: Date | null
    date_updated: Date | null
    image: string | null
  }[]>`
    SELECT id_cms, date_published, date_updated, image
    FROM ${sql(PG_SCHEMA)}.cs_cms_extra
  `
  const out = new Map<number, CmsExtra>()
  for (const r of rows) {
    out.set(Number(r.id_cms), {
      date_published: r.date_published ? r.date_published.toISOString() : '',
      date_updated:   r.date_updated   ? r.date_updated.toISOString()   : '',
      image: r.image ?? '',
    })
  }
  return out
}

async function loadLinkmap(): Promise<Map<string, CrosslinkEntry>> {
  // cs_crosslinks remplace internal_links.json FS (DB-First doctrine).
  // same_subcat / same_pillar / cross_pillar are stored as TEXT JSON
  // (legacy `ac_linkmap.py` output) — we just count the number
  // of entries without interpreting the content.
  const sql = getPgClient()
  const rows = await sql<{
    link_rewrite: string
    same_subcat: string | null
    same_pillar: string | null
    cross_pillar: string | null
  }[]>`
    SELECT link_rewrite, same_subcat, same_pillar, cross_pillar
    FROM ${sql(PG_SCHEMA)}.cs_crosslinks
  `
  const safeLen = (s: string | null) => {
    if (!s) return 0
    try {
      const v = JSON.parse(s)
      return Array.isArray(v) ? v.length : 0
    } catch { return 0 }
  }
  const out = new Map<string, CrosslinkEntry>()
  for (const r of rows) {
    out.set(r.link_rewrite, {
      same_subcat:  safeLen(r.same_subcat),
      same_pillar:  safeLen(r.same_pillar),
      cross_pillar: safeLen(r.cross_pillar),
    })
  }
  return out
}

// ── Checks ──────────────────────────────────────────────────────────────

async function checkHttp(url: string): Promise<Check> {
  const { status } = await httpGet(`${NUXT_INTERNAL}${url}`)
  if (status === 200) return { name: 'http', status: 'ok', detail: 'HTTP 200' }
  if (status === 401) return { name: 'http', status: 'ok', detail: 'HTTP 401 (htpasswd preprod)' }
  return { name: 'http', status: 'error', detail: `HTTP ${status}` }
}

function checkCover(article: Article, extras: Map<number, CmsExtra>): Check {
  const cover = article.coverImage ?? ''
  const extra = extras.get(article.id)
  const extraCover = extra?.image ?? ''
  if (cover) return { name: 'cover', status: 'ok', detail: `cover: ${cover.split('/').pop()?.slice(0, 40)}` }
  if (extraCover) return { name: 'cover', status: 'ok', detail: `cover (extra): ${extraCover.split('/').pop()?.slice(0, 40)}` }
  return { name: 'cover', status: 'error', detail: 'pas de cover' }
}

function checkDates(article: Article, extras: Map<number, CmsExtra>): Check {
  const e = extras.get(article.id)
  const pub = e?.date_published ?? ''
  const upd = e?.date_updated   ?? ''
  if (pub && upd) return { name: 'dates', status: 'ok', detail: `pub: ${pub.slice(0, 10)}, upd: ${upd.slice(0, 10)}` }
  if (pub)        return { name: 'dates', status: 'warn', detail: `pub: ${pub.slice(0, 10)}, pas de date_updated` }
  return { name: 'dates', status: 'error', detail: 'pas de dates dans cs_cms_extra' }
}

function checkJsonLd(html: string, pageType: 'article' | 'static'): Check {
  const types = extractJsonLdTypes(html)
  if (types.size === 0) return { name: 'json-ld', status: 'error', detail: 'aucun JSON-LD' }
  if (pageType === 'article') {
    const required = ['Article', 'BreadcrumbList']
    const missing = required.filter((t) => !types.has(t))
    if (missing.length) {
      return {
        name: 'json-ld', status: 'warn',
        detail: `manquant: ${missing.join(', ')} (trouvés: ${[...types].join(', ')})`,
      }
    }
    const hasFaq = types.has('FAQPage')
    return {
      name: 'json-ld', status: 'ok',
      detail: `JSON-LD: ${[...types].sort().join(', ')}${hasFaq ? ' + FAQ' : ''}`,
    }
  }
  return { name: 'json-ld', status: 'ok', detail: `JSON-LD: ${[...types].sort().join(', ')}` }
}

function checkMetaTitle(html: string): Check {
  const t = extractTitle(html)
  if (!t) return { name: 'meta-title', status: 'error', detail: 'pas de <title>' }
  if (t.length > 60) return { name: 'meta-title', status: 'warn', detail: `title trop long (${t.length} chars)` }
  return { name: 'meta-title', status: 'ok', detail: `title (${t.length} chars)` }
}

function checkMetaDescription(html: string): Check {
  const d = extractMetaDescription(html)
  if (!d) return { name: 'meta-desc', status: 'error', detail: 'pas de meta description' }
  if (d.length > 160) return { name: 'meta-desc', status: 'warn', detail: `description trop longue (${d.length} chars)` }
  return { name: 'meta-desc', status: 'ok', detail: `description (${d.length} chars)` }
}

function checkFaq(html: string): Check {
  const n = countFaq(html)
  if (n >= 15) return { name: 'faq', status: 'ok', detail: `${n} questions FAQ` }
  if (n > 0)   return { name: 'faq', status: 'warn', detail: `seulement ${n} questions FAQ (min: 15)` }
  return { name: 'faq', status: 'warn', detail: 'pas de FAQ détectée' }
}

function checkInternalLinks(article: Article, linkmap: Map<string, CrosslinkEntry>): Check {
  const lr = article.linkRewrite ?? ''
  const entry = linkmap.get(lr)
  if (!entry) return { name: 'liens-internes', status: 'warn', detail: 'absent cs_crosslinks' }
  const total = entry.same_subcat + entry.same_pillar + entry.cross_pillar
  if (total >= 2) return { name: 'liens-internes', status: 'ok', detail: `${total} liens mappés` }
  return { name: 'liens-internes', status: 'warn', detail: `seulement ${total} lien(s)` }
}

function checkSlugFormat(article: Article): Check {
  const lr = article.linkRewrite ?? ''
  const parts = lr.split('--')
  if (parts.length >= 3) return { name: 'slug', status: 'ok', detail: `slug 3 segments: ${lr.slice(0, 50)}` }
  if (parts.length === 2) return { name: 'slug', status: 'warn', detail: `slug 2 segments: ${lr.slice(0, 50)}` }
  return { name: 'slug', status: 'error', detail: `slug invalide: ${lr.slice(0, 50)}` }
}

// ── Auto-fixes natifs DB (AUDIT_MODE=active uniquement) ─────────────────

const APOSTROPHE_PATTERNS: readonly [string, string][] = [
  ['d un', "d'un"], ['l un', "l'un"], ['l agent', "l'agent"],
  ['l intelligence', "l'intelligence"], ['l erreur', "l'erreur"],
  ['l art', "l'art"], ['n est', "n'est"], ['qu il', "qu'il"],
  ['qu on', "qu'on"], ['j ai', "j'ai"], ['s il', "s'il"],
  ['c est', "c'est"], ['l entreprise', "l'entreprise"],
  ['l experience', "l'expérience"], ['d une', "d'une"],
  ['l equipe', "l'équipe"], ['l e-commerce', "l'e-commerce"],
]

async function fixMissingDates(articleId: number): Promise<boolean> {
  const sql = getPgClient()
  try {
    await sql`
      INSERT INTO ${sql(PG_SCHEMA)}.cs_cms_extra (id_cms, date_published, date_updated)
      VALUES (${articleId}, NOW(), NOW())
      ON CONFLICT (id_cms) DO UPDATE SET
        date_published = COALESCE(cs_cms_extra.date_published, EXCLUDED.date_published),
        date_updated   = EXCLUDED.date_updated
    `
    return true
  } catch { return false }
}

async function fixEscapedNewlines(articleId: number): Promise<boolean> {
  const sql = getPgClient()
  try {
    const rows = await sql<{ content: string | null }[]>`
      SELECT content FROM ${sql(PG_SCHEMA)}.ps_cms_lang
      WHERE id_cms = ${articleId} AND id_lang = 1
    `
    const content = rows[0]?.content
    if (!content || !content.includes('\\n')) return false
    const fixed = content.replace(/\\n/g, '\n').replace(/\\r/g, '')
    await sql`
      UPDATE ${sql(PG_SCHEMA)}.ps_cms_lang
      SET content = ${fixed}
      WHERE id_cms = ${articleId} AND id_lang = 1
    `
    return true
  } catch { return false }
}

async function fixMissingApostrophes(articleId: number): Promise<boolean> {
  const sql = getPgClient()
  let anyFixed = false
  for (const field of ['meta_title', 'meta_description'] as const) {
    try {
      const rows = await sql<{ v: string | null }[]>`
        SELECT ${sql(field)} AS v FROM ${sql(PG_SCHEMA)}.ps_cms_lang
        WHERE id_cms = ${articleId} AND id_lang = 1
      `
      const v = rows[0]?.v
      if (v == null) continue
      let fixed = v
      for (const [w, r] of APOSTROPHE_PATTERNS) fixed = fixed.split(w).join(r)
      if (fixed === v) continue
      await sql`
        UPDATE ${sql(PG_SCHEMA)}.ps_cms_lang
        SET ${sql(field)} = ${fixed}
        WHERE id_cms = ${articleId} AND id_lang = 1
      `
      anyFixed = true
    } catch { /* continue */ }
  }
  return anyFixed
}

async function fixHtmlInFaq(articleId: number): Promise<boolean> {
  const sql = getPgClient()
  try {
    const rows = await sql<{ content: string | null }[]>`
      SELECT content FROM ${sql(PG_SCHEMA)}.ps_cms_lang
      WHERE id_cms = ${articleId} AND id_lang = 1
    `
    const content = rows[0]?.content
    if (!content) return false
    let changed = false
    const fixed = content.replace(/(<dd[^>]*>)([\s\S]*?)(<\/dd>)/gi, (_full, open, inner, close) => {
      const cleaned = inner.replace(/<[^>]+>/g, '')
      if (cleaned !== inner) changed = true
      return open + cleaned + close
    })
    if (!changed) return false
    await sql`
      UPDATE ${sql(PG_SCHEMA)}.ps_cms_lang
      SET content = ${fixed}
      WHERE id_cms = ${articleId} AND id_lang = 1
    `
    return true
  } catch { return false }
}

// ── Audit page-by-page ──────────────────────────────────────────────────

async function auditArticle(
  article: Article,
  extras: Map<number, CmsExtra>,
  linkmap: Map<string, CrosslinkEntry>,
  mode: AuditMode,
): Promise<PageResult> {
  const url = article.nuxtUrl ?? ''
  const result: PageResult = { url, page_type: 'article', article_id: article.id, checks: [] }

  const httpCheck = await checkHttp(url)
  result.checks.push(httpCheck)

  // Cover (auto-fix Python subprocess skipped Wave 1, see header)
  result.checks.push(checkCover(article, extras))

  // Dates (fix natif DB possible en mode active)
  let dates = checkDates(article, extras)
  if (dates.status === 'error' && mode === 'active') {
    if (await fixMissingDates(article.id)) {
      dates = { name: 'dates', status: 'fixed', detail: 'dates injectées' }
    }
  }
  result.checks.push(dates)

  // JSON-LD + meta + FAQ (HTML read, no native fixes)
  if (httpCheck.status === 'ok') {
    const { body } = await httpGet(`${NUXT_INTERNAL}${url}`)
    result.checks.push(checkJsonLd(body, 'article'))
    result.checks.push(checkMetaTitle(body))
    result.checks.push(checkMetaDescription(body))
    result.checks.push(checkFaq(body))
  } else {
    for (const n of ['json-ld', 'meta-title', 'meta-desc', 'faq']) {
      result.checks.push({ name: n, status: 'warn', detail: 'page inaccessible' })
    }
  }

  // Internal links (auto-fix Python subprocess skipped Wave 1)
  result.checks.push(checkInternalLinks(article, linkmap))

  // Slug
  result.checks.push(checkSlugFormat(article))

  // Tuyauterie contenu (fix natifs DB en mode active)
  if (mode === 'active') {
    if (await fixEscapedNewlines(article.id)) {
      result.checks.push({ name: 'fix-newlines', status: 'fixed', detail: '\\n échappés corrigés' })
    }
    if (await fixMissingApostrophes(article.id)) {
      result.checks.push({ name: 'fix-apostrophes', status: 'fixed', detail: 'apostrophes restaurées' })
    }
    if (await fixHtmlInFaq(article.id)) {
      result.checks.push({ name: 'fix-html-faq', status: 'fixed', detail: 'HTML supprimé des FAQ' })
    }
  }

  return result
}

async function auditStaticPage(url: string): Promise<PageResult> {
  const result: PageResult = { url, page_type: 'static', article_id: 0, checks: [] }
  const httpCheck = await checkHttp(url)
  result.checks.push(httpCheck)
  if (httpCheck.status === 'ok') {
    const { body } = await httpGet(`${NUXT_INTERNAL}${url}`)
    result.checks.push(checkJsonLd(body, 'static'))
    result.checks.push(checkMetaTitle(body))
    result.checks.push(checkMetaDescription(body))
  }
  return result
}

// ── Audit pipeline ──────────────────────────────────────────────────────

interface AuditOutcome {
  mode: AuditMode
  total_pages: number
  ok_pages: number
  errors: number
  warnings: number
  fixed: number
  results: PageResult[]
  summary: string
}

async function runAudit(log: AutomateLog): Promise<AuditOutcome> {
  const mode = getAuditMode(AUTOMATE_KEY)

  const t0 = Date.now()
  const articles = await fetchArticles()
  log.step('fetch_articles', 'ok', `${articles.length} articles via /api/cms`, Date.now() - t0)

  const t1 = Date.now()
  const extras  = await loadCmsExtras()
  const linkmap = await loadLinkmap()
  log.step('load_db', 'ok',
    `${extras.size} cms_extra + ${linkmap.size} crosslinks`, Date.now() - t1)

  const results: PageResult[] = []

  // Articles blog
  for (const a of articles) {
    results.push(await auditArticle(a, extras, linkmap, mode))
  }
  log.step('audit_articles', 'ok', `${articles.length} audités${mode === 'shadow' ? ' [shadow]' : ''}`)

  // Pages statiques AC
  for (const url of AC_STATIC_PAGES) {
    results.push(await auditStaticPage(url))
  }
  log.step('audit_static', 'ok', `${AC_STATIC_PAGES.length} pages statiques`)

  const errors   = results.reduce((n, r) => n + r.checks.filter((c) => c.status === 'error').length, 0)
  const warnings = results.reduce((n, r) => n + r.checks.filter((c) => c.status === 'warn').length, 0)
  const fixed    = results.reduce((n, r) => n + r.checks.filter((c) => c.status === 'fixed').length, 0)
  const okPages  = results.filter((r) =>
    r.checks.every((c) => c.status === 'ok' || c.status === 'fixed'),
  ).length

  log.count('total_pages', results.length)
  log.count('errors',   errors)
  log.count('warnings', warnings)
  log.count('fixed',    fixed)

  const summary = mode === 'shadow'
    ? `[shadow] ${results.length} pages, ${errors} erreur(s), ${warnings} warning(s) — fixes désactivés`
    : `${results.length} pages, ${okPages} OK, ${fixed} fix appliqués, ${errors} erreur(s)`

  return { mode, total_pages: results.length, ok_pages: okPages, errors, warnings, fixed, results, summary }
}

// ── Persistance DB-only ─────────────────────────────────────────────────

async function persistReport(outcome: AuditOutcome): Promise<void> {
  const sql = getPgClient()
  // Only store pages with issues (compact report — parity with Python).
  const issues = outcome.results
    .filter((r) => r.checks.some((c) => c.status !== 'ok'))
    .map((r) => ({
      url: r.url,
      type: r.page_type,
      article_id: r.article_id,
      checks: r.checks,
    }))
  const dataJson = JSON.stringify({
    date: new Date().toISOString(),
    mode: outcome.mode,
    total_pages: outcome.total_pages,
    ok_pages:    outcome.ok_pages,
    errors:      outcome.errors,
    warnings:    outcome.warnings,
    fixed:       outcome.fixed,
    pages_with_issues: issues,
  })
  await sql`
    DELETE FROM ${sql(PG_SCHEMA)}.cs_audit_reports
    WHERE report_type = 'pageaudit' AND report_date = CURRENT_DATE
  `
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_audit_reports
      (report_type, report_date, data_json, summary, date_add)
    VALUES
      ('pageaudit', CURRENT_DATE, ${dataJson}, ${outcome.summary.slice(0, 500)}, NOW())
  `
}

// ── Nitro Task entrypoint ───────────────────────────────────────────────

export default defineTask({
  meta: {
    name: 'audit:pageaudit',
    description: 'Audit qualité pages publiques AC (port ac_pageaudit, Wave 1 actif #2)',
  },
  async run() {
    const skip = skipIfNotAcInternal('audit:pageaudit')
    if (skip) return skip
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock(AUTOMATE_KEY, async () => {
      return runAutomate(AUTOMATE_KEY, async (log) => {
        const outcome = await runAudit(log)
        await persistReport(outcome)
        const status = outcome.errors > 0 ? 'partial' : 'ok'
        log.setResult(status, outcome.summary)
        return {
          status,
          mode: outcome.mode,
          total_pages: outcome.total_pages,
          ok_pages: outcome.ok_pages,
          errors:   outcome.errors,
          warnings: outcome.warnings,
          fixed:    outcome.fixed,
          summary:  outcome.summary,
        }
      })
    })

    if (!lockResult.acquired) {
      return { result: { status: 'skipped', reason: 'lock-held-by-other-instance' } }
    }
    return { result: lockResult.result }
  },
})
