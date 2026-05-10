/**
 *
 * Nitro Task — audit:daily-meet
 *
 * Wave 4 of work #43 (python-nitro-tasks). Migration of
 * `daily-meet.py` (cron 0 5 * * 1-6, Monday to Saturday 5h UTC).
 *
 * Pre-calculates a daily report (~10 check sections) consumed by
 * `bin/session-brief.mjs` at the start of each session. The
 * expensive sections (articles_no_faq audit, heavy DB queries) run here
 * once per day; the standalone TS wrapper on the host side enriches with the
 * real-time information at SessionStart time (git, crontab, emails, backlog).
 *
 * DB+HTTP sections migrated here:
 *   1. focus       (statique : calendrier hebdomadaire)
 *   2. infra       (HEAD HTTP prod + preprod)
 *   3. automates   (SELECT cs_automate_logs result='error' 24h)
 *   4. reports     (SELECT cs_audit_reports 24h)
 * 5. covers (SELECT COUNT cs_cms_extra generate_cover=1 without image)
 * 6. faq (SELECT articles blog without joined cs_faq)
 * 7. cron_errors (SELECT cs_cron_errors 24h, aggregated by script)
 *
 * Sections host-side (git log, crontab, deploy_pending) → wrapper TS.
 *
 * Stockage DB-only :
 *   - INSERT cs_audit_reports (report_type='daily_meet', report_date=today)
 * DELETE before INSERT for idempotence (1 row per day, last run wins)
 *
 * No AUDIT_MODE: audit-only, no business write operations (no email, no
 * mutation hors cs_audit_reports).
 */

import { defineTask } from 'nitropack/runtime'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate, type AutomateLog } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'
import { skipIfNotAcInternal } from '~/server/utils/cron-context'

const PG_SCHEMA = 'cs_main'
const AUTOMATE_KEY = 'ac_daily_meet'

const PROD_URL = 'https://codemyshop.com'
const PREPROD_URL = 'https://preprod.codemyshop.com'
const PREPROD_AUTH = 'preprod:preprod'
const HTTP_TIMEOUT_MS = 10_000

const JOURS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const

interface FocusEntry {
  focus: string
  desc: string
  agents: string
  interdit: string
}

const WEEKLY_FOCUS: Record<number, FocusEntry> = {
  0: { focus: 'PRODUIT',           desc: 'Code, features, modules, bugs',          agents: 'Turing, Eames, Brunel',           interdit: 'Contenu, stratégie' },
  1: { focus: 'CLIENT + COMMERCIAL', desc: 'Calls, tunnel, leads, email',           agents: 'Bernays, Colbert, Nightingale',   interdit: 'Code pur, infra' },
  2: { focus: 'CONTENU',           desc: 'Blog, Academy, dictionnaire (journée coupée)', agents: 'Pulitzer, Ogilvy, Montessori', interdit: 'Code, infra' },
  3: { focus: 'INFRA & SÉCURITÉ',  desc: 'Deploy, audit, hardening',               agents: 'Brunel, Mitnick, Lovelace',       interdit: 'Contenu, commercial' },
  4: { focus: 'STRATÉGIE & ADMIN', desc: 'Docs, roadmap, juridique, rétro',        agents: 'Clausewitz, Colbert, Montesquieu', interdit: 'Code' },
  5: { focus: 'VEILLE',            desc: 'YouTube, tendances IA/e-commerce',       agents: 'Gauss, Clausewitz',               interdit: 'Code, deploy' },
  6: { focus: 'REPOS / Jonah',     desc: '',                                       agents: '',                                 interdit: 'Tout' },
}

type Severity = 'BLOQUANT' | 'MAJEUR' | 'MINEUR'

interface Alert { severity: Severity; msg: string }

interface DailyMeetReport {
  date: string
  alerts: Alert[]
  focus: { day: string; date: string } & FocusEntry
  infra: { prod: number; preprod: number; prod_ok: boolean; preprod_ok: boolean }
  automates: { error_count: number; errors: Array<{ automate: string; result_detail: string; date_add: string }> }
  reports: Array<{ report_type: string; report_date: string; summary: string }>
  covers_pending: number
  articles_no_faq: number
  cron_errors: {
    total: number
    scripts_in_error: number
    auto_fixed: number
    failed: number
    deactivated: number
    deactivated_list: string[]
    details: Array<{ script: string; error_type: string; auto_fixed: boolean; fix: string | null }>
  }
}

// ── Schema guard ────────────────────────────────────────────────────────────

async function pgSchemaExists(schema: string): Promise<boolean> {
  const sql = getPgClient()
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schema}
    ) AS exists
  `
  return Boolean(rows[0]?.exists)
}

// ── HTTP avec timeout ───────────────────────────────────────────────────────

async function httpStatus(url: string, basicAuth?: string): Promise<number> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS)
  const headers: Record<string, string> = {
    'User-Agent': 'audit:daily-meet/1.0',
  }
  if (basicAuth) {
    headers.Authorization = `Basic ${Buffer.from(basicAuth).toString('base64')}`
  }
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual', signal: ctrl.signal, headers })
    return res.status
  } catch {
    return 0
  } finally {
    clearTimeout(timer)
  }
}

// ── Section checks ──────────────────────────────────────────────────────────

function checkFocus(): DailyMeetReport['focus'] {
  const today = new Date()
  const wd = (today.getDay() + 6) % 7 // JS dim=0 → lun=0 (Python convention)
  return {
    day: JOURS_FR[wd],
    date: today.toISOString().slice(0, 10),
    ...WEEKLY_FOCUS[wd],
  }
}

async function checkInfra(): Promise<DailyMeetReport['infra']> {
  const [prod, preprod] = await Promise.all([
    httpStatus(PROD_URL),
    httpStatus(PREPROD_URL, PREPROD_AUTH),
  ])
  return {
    prod, preprod,
    prod_ok: prod === 200,
    preprod_ok: prod === 200 || preprod === 200 || preprod === 401, // 401 = htpasswd OK
  }
}

async function checkAutomates(): Promise<DailyMeetReport['automates']> {
  const sql = getPgClient()
  const rows = await sql<{ automate: string; result_detail: string | null; date_add: Date }[]>`
    SELECT automate, result_detail, date_add
    FROM ${sql(PG_SCHEMA)}.cs_automate_logs
    WHERE result IN ('error', 'partial')
      AND date_add > NOW() - INTERVAL '24 hours'
    ORDER BY id_log DESC
    LIMIT 20
  `
  return {
    error_count: rows.length,
    errors: rows.map((r) => ({
      automate: r.automate,
      result_detail: (r.result_detail ?? '').slice(0, 200),
      date_add: r.date_add.toISOString(),
    })),
  }
}

async function checkFreshReports(): Promise<DailyMeetReport['reports']> {
  const sql = getPgClient()
  const rows = await sql<{ report_type: string; report_date: Date; summary: string | null }[]>`
    SELECT report_type, report_date, summary
    FROM ${sql(PG_SCHEMA)}.cs_audit_reports
    WHERE date_add > NOW() - INTERVAL '24 hours'
      AND report_type <> 'daily_meet'
    ORDER BY date_add DESC
    LIMIT 15
  `
  return rows.map((r) => ({
    report_type: r.report_type,
    report_date: r.report_date.toISOString().slice(0, 10),
    summary: (r.summary ?? '').slice(0, 200),
  }))
}

async function checkCoversPending(): Promise<number> {
  const sql = getPgClient()
  try {
    const rows = await sql<{ n: number }[]>`
      SELECT COUNT(*)::int AS n
      FROM ${sql(PG_SCHEMA)}.cs_cms_extra
      WHERE generate_cover = 1
        AND (image IS NULL OR image = '')
    `
    return rows[0]?.n ?? 0
  } catch {
    return -1
  }
}

async function checkArticlesNoFaq(): Promise<number> {
  // Port simplifié de ArticleEntity().audit_all() : compte les articles
  // blog actifs sans aucune row cs_faq parent_type='cms' parent_id=id_cms.
  // Source de vérité = cs_faq (table polymorphique, voir backlog #162).
  const sql = getPgClient()
  try {
    const rows = await sql<{ n: number }[]>`
      SELECT COUNT(*)::int AS n
      FROM ${sql(PG_SCHEMA)}.ps_cms c
      WHERE c.active = 1
        AND NOT EXISTS (
          SELECT 1 FROM ${sql(PG_SCHEMA)}.cs_faq f
          WHERE f.parent_type = 'cms' AND f.parent_id = c.id_cms AND f.active = 1
        )
    `
    return rows[0]?.n ?? 0
  } catch {
    return -1
  }
}

async function checkCronErrors(): Promise<DailyMeetReport['cron_errors']> {
  const sql = getPgClient()
  try {
    const rows = await sql<{
      script_name: string
      error_type: string
      auto_fixed: number
      fix_applied: string | null
      retry_success: number | null
      deactivated: number
    }[]>`
      SELECT script_name, error_type, auto_fixed, fix_applied, retry_success, deactivated
      FROM ${sql(PG_SCHEMA)}.cs_cron_errors
      WHERE date_add >= NOW() - INTERVAL '24 hours'
      ORDER BY date_add DESC
    `

    const perScript = new Map<string, {
      auto_fixed: boolean
      retry_ok: boolean
      deactivated: boolean
      count: number
    }>()
    const deactivatedSet = new Set<string>()
    const details: DailyMeetReport['cron_errors']['details'] = []

    for (const r of rows) {
      const name = r.script_name
      details.push({
        script: name,
        error_type: r.error_type,
        auto_fixed: r.auto_fixed === 1,
        fix: r.fix_applied,
      })
      if (r.deactivated === 1) deactivatedSet.add(name)
      const agg = perScript.get(name) ?? { auto_fixed: false, retry_ok: false, deactivated: false, count: 0 }
      agg.count += 1
      if (r.auto_fixed === 1) agg.auto_fixed = true
      if (r.retry_success === 1) agg.retry_ok = true
      if (r.deactivated === 1) agg.deactivated = true
      perScript.set(name, agg)
    }

    let autoFixed = 0
    let failed = 0
    for (const s of perScript.values()) {
      if (s.auto_fixed) autoFixed += 1
      else if (!s.retry_ok && !s.deactivated) failed += 1
    }

    return {
      total: rows.length,
      scripts_in_error: perScript.size,
      auto_fixed: autoFixed,
      failed,
      deactivated: deactivatedSet.size,
      deactivated_list: [...deactivatedSet].sort(),
      details: details.slice(0, 10),
    }
  } catch {
    return { total: 0, scripts_in_error: 0, auto_fixed: 0, failed: 0, deactivated: 0, deactivated_list: [], details: [] }
  }
}

// ── Audit orchestrator ──────────────────────────────────────────────────────

async function runAudit(log: AutomateLog): Promise<DailyMeetReport> {
  const focus = checkFocus()
  log.step('focus', 'ok', `${focus.day} — ${focus.focus}`)

  const infra = await checkInfra()
  log.step('infra', infra.prod_ok && infra.preprod_ok ? 'ok' : 'warning',
    `prod=${infra.prod} preprod=${infra.preprod}`)

  const automates = await checkAutomates()
  log.step('automates', automates.error_count > 0 ? 'warning' : 'ok',
    `${automates.error_count} error/partial 24h`)

  const reports = await checkFreshReports()
  log.step('reports', 'ok', `${reports.length} rapports 24h`)

  const coversPending = await checkCoversPending()
  log.step('covers', coversPending > 0 ? 'warning' : 'ok', `${coversPending} cover(s) pending`)

  const articlesNoFaq = await checkArticlesNoFaq()
  log.step('faq', articlesNoFaq > 0 ? 'warning' : 'ok', `${articlesNoFaq} articles sans FAQ`)

  const cronErrors = await checkCronErrors()
  log.step('cron_errors', cronErrors.failed > 0 || cronErrors.deactivated > 0 ? 'warning' : 'ok',
    `${cronErrors.scripts_in_error} scripts in error (${cronErrors.failed} failed, ${cronErrors.deactivated} deactivated)`)

  const alerts: Alert[] = []
  if (!infra.prod_ok)    alerts.push({ severity: 'BLOQUANT', msg: `Prod HTTP ${infra.prod}` })
  if (!infra.preprod_ok) alerts.push({ severity: 'MAJEUR',   msg: `Preprod HTTP ${infra.preprod}` })
  if (automates.error_count > 0) alerts.push({ severity: 'MAJEUR', msg: `${automates.error_count} automate(s) en erreur` })
  if (coversPending > 0)         alerts.push({ severity: 'MINEUR', msg: `${coversPending} cover(s) en attente` })
  if (cronErrors.deactivated > 0) alerts.push({ severity: 'BLOQUANT', msg: `${cronErrors.deactivated} script(s) désactivé(s) par le watchdog` })
  if (cronErrors.failed > 0)      alerts.push({ severity: 'MAJEUR', msg: `${cronErrors.failed} script(s) en crash répété sans repair` })

  log.count('alerts_total', alerts.length)
  log.count('alerts_bloquant', alerts.filter((a) => a.severity === 'BLOQUANT').length)
  log.count('alerts_majeur',   alerts.filter((a) => a.severity === 'MAJEUR').length)
  log.count('alerts_mineur',   alerts.filter((a) => a.severity === 'MINEUR').length)

  return {
    date: new Date().toISOString().slice(0, 16).replace('T', ' '),
    alerts,
    focus,
    infra,
    automates,
    reports,
    covers_pending: coversPending,
    articles_no_faq: articlesNoFaq,
    cron_errors: cronErrors,
  }
}

// ── Persistance DB-only ─────────────────────────────────────────────────────

async function persistReport(report: DailyMeetReport): Promise<void> {
  const sql = getPgClient()
  const bloquant = report.alerts.filter((a) => a.severity === 'BLOQUANT').length
  const majeur   = report.alerts.filter((a) => a.severity === 'MAJEUR').length
  const mineur   = report.alerts.filter((a) => a.severity === 'MINEUR').length
  const summary = report.alerts.length === 0
    ? 'TOUT EST PROPRE — bonne session.'
    : `${report.alerts.length} alerte(s) : ${bloquant} bloquant, ${majeur} majeur, ${mineur} mineur`

  await sql`
    DELETE FROM ${sql(PG_SCHEMA)}.cs_audit_reports
    WHERE report_type = 'daily_meet' AND report_date = CURRENT_DATE
  `
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_audit_reports
      (report_type, report_date, data_json, summary, date_add)
    VALUES
      ('daily_meet', CURRENT_DATE, ${JSON.stringify(report)}, ${summary.slice(0, 500)}, NOW())
  `
}

// ── Nitro Task entrypoint ───────────────────────────────────────────────────

export default defineTask({
  meta: {
    name: 'audit:daily-meet',
    description: 'Briefing quotidien pré-calculé pour SessionStart hook (port ac_daily_meet, Wave 4)',
  },
  async run() {
    const skip = skipIfNotAcInternal('audit:daily-meet')
    if (skip) return { result: skip }
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock(AUTOMATE_KEY, async () => {
      return runAutomate(AUTOMATE_KEY, async (log) => {
        const report = await runAudit(log)
        await persistReport(report)
        const status = report.alerts.some((a) => a.severity === 'BLOQUANT') ? 'partial' : 'ok'
        const summary = report.alerts.length === 0
          ? 'tout propre'
          : `${report.alerts.length} alerte(s)`
        log.setResult(status, summary)
        return { status, ...report }
      })
    })

    if (!lockResult.acquired) {
      return { result: { status: 'skipped', reason: 'lock-held-by-other-instance' } }
    }
    return { result: lockResult.result }
  },
})
