/**
 *
 * Nitro Task — audit:blog-hygiene
 *
 * Wave 1 active (first write-side monitoring) of work #43. Migration of
 * `synedre/ac_blog_hygiene.py` (cron quotidien 07:30 UTC).
 *
 * 3 checks + remediation:
 * 1. Duplicates by slug → keeps the longest, disables the rest.
 *   2. Doublons par titre (slugs ≠) → idem.
 * 3. Active near-empty pages (< 500 chars) → disables.
 *
 * Execution mode controlled by AUDIT_MODE:
 * 'shadow' (default): checks run, report persisted, NO
 *                          UPDATE ps_cms.active=0. Cron Python reste
 * source of truth during shadow.
 * 'active': effective UPDATE ps_cms.active=0. The cron
 * Python must be disabled in parallel.
 *
 * Stockage DB-only : INSERT idempotent cs_audit_reports
 * (report_type='blog_hygiene', 1 row/jour).
 */

import { defineTask } from 'nitropack/runtime'
import { skipIfNotAcInternal } from '~/server/utils/cron-context'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate, type AutomateLog } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'
import { getAuditMode, type AuditMode } from '~/server/utils/audit-mode'

const PG_SCHEMA = 'cs_main'
const AUTOMATE_KEY = 'ac_blog_hygiene'

const PROTECTED_SLUGS: ReadonlySet<string> = new Set([
  'livraison', 'mentions-legales', 'conditions-generales-de-vente',
  'confidentialite', 'a-propos',
])

const MIN_CONTENT_LENGTH = 500

interface Article {
  id: number
  active: boolean
  title: string
  slug: string
  content_len: number
  date_add: string | null
}

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

// ── Loaders DB ──────────────────────────────────────────────────────────

async function loadAllArticles(): Promise<Article[]> {
  const sql = getPgClient()
  const rows = await sql<{
    id_cms: number
    active: boolean | number
    meta_title: string | null
    link_rewrite: string | null
    content_len: number | null
    date_add: Date | null
  }[]>`
    SELECT c.id_cms,
           c.active,
           cl.meta_title,
           cl.link_rewrite,
           LENGTH(cl.content) AS content_len,
           c.date_add
    FROM ${sql(PG_SCHEMA)}.ps_cms c
    JOIN ${sql(PG_SCHEMA)}.ps_cms_lang cl ON c.id_cms = cl.id_cms
    WHERE cl.id_lang = 1
    ORDER BY cl.link_rewrite
  `
  return rows.map((r) => ({
    id: Number(r.id_cms),
    active: r.active === true || r.active === 1,
    title: r.meta_title ?? '',
    slug: r.link_rewrite ?? '',
    content_len: Number(r.content_len ?? 0),
    date_add: r.date_add ? r.date_add.toISOString() : null,
  }))
}

async function deactivateArticle(id: number): Promise<boolean> {
  const sql = getPgClient()
  try {
    await sql`UPDATE ${sql(PG_SCHEMA)}.ps_cms SET active = 0 WHERE id_cms = ${id}`
    return true
  } catch {
    return false
  }
}

// ── Checks ──────────────────────────────────────────────────────────────

interface FixEntry {
  kind: 'slug_dup' | 'title_dup' | 'empty_page'
  keeper_id: number | null  // null pour empty_page
  victim_id: number
  victim_slug: string
  victim_content_len: number
  applied: boolean   // true = UPDATE effectif, false = shadow ou échec
}

async function checkSlugDuplicates(
  articles: Article[], mode: AuditMode, log: AutomateLog,
): Promise<FixEntry[]> {
  const ts = Date.now()
  const active = articles.filter((a) => a.active && !PROTECTED_SLUGS.has(a.slug))
  const bySlug = new Map<string, Article[]>()
  for (const a of active) {
    const list = bySlug.get(a.slug) ?? []
    list.push(a)
    bySlug.set(a.slug, list)
  }

  const fixes: FixEntry[] = []
  for (const [, group] of bySlug) {
    if (group.length <= 1) continue
    group.sort((a, b) => b.content_len - a.content_len)
    const keeper = group[0]
    for (const v of group.slice(1)) {
      const applied = mode === 'active' ? await deactivateArticle(v.id) : false
      fixes.push({
        kind: 'slug_dup', keeper_id: keeper.id, victim_id: v.id,
        victim_slug: v.slug, victim_content_len: v.content_len, applied,
      })
    }
  }
  log.step('slug_duplicates', 'ok',
    `${fixes.length} doublon(s) slug${mode === 'shadow' ? ' [shadow]' : ''}`,
    Date.now() - ts)
  return fixes
}

async function checkTitleDuplicates(
  articles: Article[], mode: AuditMode, log: AutomateLog,
): Promise<FixEntry[]> {
  const ts = Date.now()
  const active = articles.filter((a) => a.active && !PROTECTED_SLUGS.has(a.slug))
  const byTitle = new Map<string, Article[]>()
  for (const a of active) {
    const list = byTitle.get(a.title) ?? []
    list.push(a)
    byTitle.set(a.title, list)
  }

  const fixes: FixEntry[] = []
  for (const [, group] of byTitle) {
    if (group.length <= 1) continue
    const slugs = new Set(group.map((a) => a.slug))
    if (slugs.size === 1) continue   // déjà géré par slug_duplicates
    group.sort((a, b) => b.content_len - a.content_len)
    const keeper = group[0]
    for (const v of group.slice(1)) {
      const applied = mode === 'active' ? await deactivateArticle(v.id) : false
      fixes.push({
        kind: 'title_dup', keeper_id: keeper.id, victim_id: v.id,
        victim_slug: v.slug, victim_content_len: v.content_len, applied,
      })
    }
  }
  log.step('title_duplicates', 'ok',
    `${fixes.length} doublon(s) titre${mode === 'shadow' ? ' [shadow]' : ''}`,
    Date.now() - ts)
  return fixes
}

async function checkEmptyPages(
  articles: Article[], mode: AuditMode, log: AutomateLog,
): Promise<FixEntry[]> {
  const ts = Date.now()
  const empty = articles.filter((a) =>
    a.active
    && a.content_len < MIN_CONTENT_LENGTH
    && !PROTECTED_SLUGS.has(a.slug)
    && a.slug.includes('--'),  // articles blog seulement (pattern category--slug)
  )

  const fixes: FixEntry[] = []
  for (const a of empty) {
    const applied = mode === 'active' ? await deactivateArticle(a.id) : false
    fixes.push({
      kind: 'empty_page', keeper_id: null, victim_id: a.id,
      victim_slug: a.slug, victim_content_len: a.content_len, applied,
    })
  }
  log.step('empty_pages', 'ok',
    `${fixes.length} page(s) vide(s)${mode === 'shadow' ? ' [shadow]' : ''}`,
    Date.now() - ts)
  return fixes
}

// ── Audit ───────────────────────────────────────────────────────────────

interface AuditOutcome {
  mode: AuditMode
  total_articles: number
  active_articles: number
  fixes: FixEntry[]
  summary: string
}

async function runAudit(log: AutomateLog): Promise<AuditOutcome> {
  const mode = getAuditMode(AUTOMATE_KEY)

  let articles = await loadAllArticles()
  const activeCount = articles.filter((a) => a.active).length
  log.count('total_articles', articles.length)
  log.count('active_articles', activeCount)

  const slugFixes = await checkSlugDuplicates(articles, mode, log)
  if (slugFixes.some((f) => f.applied)) articles = await loadAllArticles()
  const titleFixes = await checkTitleDuplicates(articles, mode, log)
  if (titleFixes.some((f) => f.applied)) articles = await loadAllArticles()
  const emptyFixes = await checkEmptyPages(articles, mode, log)

  const fixes = [...slugFixes, ...titleFixes, ...emptyFixes]
  const applied = fixes.filter((f) => f.applied).length
  log.count('fixes_total',   fixes.length)
  log.count('fixes_applied', applied)

  const summary = mode === 'shadow'
    ? `[shadow] ${fixes.length} correction(s) détectée(s) — non appliquées`
    : `${applied}/${fixes.length} correction(s) appliquée(s)`

  return {
    mode, total_articles: articles.length, active_articles: activeCount,
    fixes, summary,
  }
}

// ── Persistance DB-only ─────────────────────────────────────────────────

async function persistReport(outcome: AuditOutcome): Promise<void> {
  const sql = getPgClient()
  const dataJson = JSON.stringify({
    date: new Date().toISOString(),
    mode: outcome.mode,
    total_articles: outcome.total_articles,
    active_articles: outcome.active_articles,
    counts: {
      slug_dup:   outcome.fixes.filter((f) => f.kind === 'slug_dup').length,
      title_dup:  outcome.fixes.filter((f) => f.kind === 'title_dup').length,
      empty_page: outcome.fixes.filter((f) => f.kind === 'empty_page').length,
      applied:    outcome.fixes.filter((f) => f.applied).length,
    },
    fixes: outcome.fixes,
  })

  await sql`
    DELETE FROM ${sql(PG_SCHEMA)}.cs_audit_reports
    WHERE report_type = 'blog_hygiene' AND report_date = CURRENT_DATE
  `
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_audit_reports
      (report_type, report_date, data_json, summary, date_add)
    VALUES
      ('blog_hygiene', CURRENT_DATE, ${dataJson}, ${outcome.summary.slice(0, 500)}, NOW())
  `
}

// ── Nitro Task entrypoint ───────────────────────────────────────────────

export default defineTask({
  meta: {
    name: 'audit:blog-hygiene',
    description: 'Hygiène blog : doublons + pages vides (port ac_blog_hygiene, Wave 1 actif #1)',
  },
  async run() {
    const skip = skipIfNotAcInternal('audit:blog-hygiene')
    if (skip) return skip
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock(AUTOMATE_KEY, async () => {
      return runAutomate(AUTOMATE_KEY, async (log) => {
        const outcome = await runAudit(log)
        await persistReport(outcome)
        const status = outcome.fixes.length > 0 ? 'partial' : 'ok'
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
