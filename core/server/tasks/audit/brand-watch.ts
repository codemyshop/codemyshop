/**
 *
 * Nitro Task — audit:brand-watch
 *
 * Wave 2 of work #43 (monitoring for external dependencies). Migration of
 * `synedre/ac_brand_watch.py` (cron quotidien 07:00 UTC).
 *
 * SERP monitoring of proprietary technology (
 * Souverain, Flywheel, etc.) via Google Custom Search Engine API v1.
 * Detects new competitors between runs and alerts by email.
 *
 * DB-Only :
 * Monitored terms → cs_brand_watch_term (active=1)
 *                              + last_check / total_results / competitor_results
 *  - Concurrents historiques → cs_brand_watch_competitor
 *                              (1 row par paire term/domain, first_seen/last_seen)
 *  - Snapshot quotidien     → cs_audit_reports (report_type='brand_watch')
 * No more JSON filesystem (the old `reports/brand-watch.json` remains
 * written by the Python cron during the shadow).
 *
 * AUDIT_MODE :
 * 'shadow' (default): checks run, DB state persisted, report
 * persisted, NO email sent.
 * 'active': actual alert email on new competitors.
 * The Python cron must be disabled in parallel.
 *
 * Required setup (environment):
 * GOOGLE_CSE_API_KEY: Google Cloud API key (Custom Search API enabled)
 *  - GOOGLE_CSE_ID         CSE id (cx) — programmablesearchengine.google.com
 *  Free tier 100 q/jour. 7 termes × 30 jours = 210 q/mois → largement OK.
 */

import { defineTask } from 'nitropack/runtime'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate, type AutomateLog } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'
import { getAuditMode, type AuditMode } from '~/server/utils/audit-mode'
import { sendSmtpMail } from '~/server/utils/smtp'
import { skipIfNotAcInternal } from '~/server/utils/cron-context'

const PG_SCHEMA = 'cs_main'
const AUTOMATE_KEY = 'ac_brand_watch'

const SMTP_HOST = 'ssl0.ovh.net'
const SMTP_PORT = 465
const SMTP_USER = process.env.IMAP_USER || 'contact@codemyshop.com'
const ALERT_TO  = process.env.BRAND_WATCH_ALERT_TO || 'contact@codemyshop.com'

const CSE_ENDPOINT = 'https://www.googleapis.com/customsearch/v1'
const CSE_NUM_RESULTS = 10
const CSE_LANG = 'lang_fr'
const CSE_TIMEOUT_MS = 15_000
const SLEEP_BETWEEN_TERMS_MS = 1_000   // CSE API n'est pas rate-limitée comme le scrape, mais on respire

// Domaines légitimes (nous-mêmes) — exclus du décompte concurrent
const OUR_DOMAINS: ReadonlySet<string> = new Set([
  'codemyshop.com',
  'codemyshop.com',
  'linkedin.com',
  'github.com',
])

interface TermRow {
  id_term: number
  term: string
  invention: string
}

interface SerpHit {
  url: string
  domain: string
  is_ours: boolean
}

interface TermOutcome {
  id_term: number
  term: string
  invention: string
  total_results: number
  our_results: number
  competitor_results: number
  competitors: { domain: string; url: string }[]
  new_alerts: { domain: string; url: string; invention: string; term: string }[]
  error: string
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

async function loadActiveTerms(): Promise<TermRow[]> {
  const sql = getPgClient()
  const rows = await sql<{ id_term: number; term: string; invention: string }[]>`
    SELECT id_term, term, invention
    FROM ${sql(PG_SCHEMA)}.cs_brand_watch_term
    WHERE active = 1
    ORDER BY position, id_term
  `
  return rows.map((r) => ({ id_term: Number(r.id_term), term: r.term, invention: r.invention }))
}

async function loadKnownDomains(idTerm: number): Promise<Set<string>> {
  const sql = getPgClient()
  const rows = await sql<{ domain: string }[]>`
    SELECT domain
    FROM ${sql(PG_SCHEMA)}.cs_brand_watch_competitor
    WHERE id_term = ${idTerm}
  `
  return new Set(rows.map((r) => r.domain))
}

async function upsertCompetitor(idTerm: number, domain: string, url: string): Promise<void> {
  const sql = getPgClient()
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_brand_watch_competitor
      (id_term, domain, url, first_seen, last_seen, date_add, date_upd)
    VALUES
      (${idTerm}, ${domain}, ${url}, NOW(), NOW(), NOW(), NOW())
    ON CONFLICT (id_term, domain) DO UPDATE SET
      url      = EXCLUDED.url,
      last_seen = NOW(),
      date_upd  = NOW()
  `
}

async function updateTermStats(t: TermOutcome): Promise<void> {
  const sql = getPgClient()
  await sql`
    UPDATE ${sql(PG_SCHEMA)}.cs_brand_watch_term
    SET last_check         = NOW(),
        total_results      = ${t.total_results},
        our_results        = ${t.our_results},
        competitor_results = ${t.competitor_results},
        date_upd           = NOW()
    WHERE id_term = ${t.id_term}
  `
}

// ── Google CSE fetch ────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url.split('//').pop()?.split('/')[0]?.replace(/^www\./, '') ?? ''
  }
}

async function searchCse(term: string, apiKey: string, cseId: string):
  Promise<{ hits: SerpHit[]; error: string }> {
  const url = new URL(CSE_ENDPOINT)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('cx', cseId)
  url.searchParams.set('q', term)
  url.searchParams.set('num', String(CSE_NUM_RESULTS))
  url.searchParams.set('lr', CSE_LANG)
  url.searchParams.set('safe', 'off')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), CSE_TIMEOUT_MS)
  try {
    const res = await fetch(url.toString(), { signal: ctrl.signal })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { hits: [], error: `HTTP ${res.status}: ${body.slice(0, 200)}` }
    }
    const json = (await res.json()) as { items?: { link?: string }[] }
    const items = Array.isArray(json.items) ? json.items : []
    const hits: SerpHit[] = items
      .filter((it) => typeof it.link === 'string')
      .map((it) => {
        const link = it.link as string
        const domain = extractDomain(link)
        const is_ours = [...OUR_DOMAINS].some((d) => domain.includes(d))
        return { url: link, domain, is_ours }
      })
    return { hits, error: '' }
  } catch (e) {
    const err = e as { name?: string; message?: string }
    return { hits: [], error: `${err.name ?? 'Error'}: ${err.message ?? String(e)}` }
  } finally {
    clearTimeout(timer)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Email sender ────────────────────────────────────────────────────────

function buildAlert(alerts: { domain: string; url: string; invention: string; term: string }[]):
  { subject: string; text: string; html: string } {
  const subject = `⚖️ ALERTE PI — ${alerts.length} concurrent(s) détecté(s) sur nos inventions`
  const lines: string[] = [
    '⚖️ MONTESQUIEU — ALERTE PROPRIÉTÉ INTELLECTUELLE',
    '',
    `Date : ${new Date().toISOString()}`,
    `Nombre d'alertes : ${alerts.length}`,
    '',
  ]
  for (const a of alerts) {
    lines.push('='.repeat(60))
    lines.push(`Invention : ${a.invention}`)
    lines.push(`Terme recherché : ${a.term}`)
    lines.push(`Concurrent détecté : ${a.domain}`)
    lines.push(`URL : ${a.url}`)
    lines.push(`Action recommandée : vérifier si utilisation de notre concept`)
    lines.push('='.repeat(60))
    lines.push('')
  }
  lines.push('')
  lines.push('Recommandation Montesquieu :')
  lines.push('1. Vérifier le contenu de chaque URL')
  lines.push("2. Si copie de concept → documenter avec date (preuve d'antériorité dans INVENTIONS.md)")
  lines.push('3. Si contrefaçon marque → contacter un avocat PI')
  lines.push('4. Si mention légitime (citation, lien) → aucune action')
  const text = lines.join('\n')
  return { subject, text, html: `<pre>${text}</pre>` }
}

async function sendIfActive(
  mode: AuditMode, payload: { subject: string; text: string; html: string }, log: AutomateLog,
): Promise<boolean> {
  if (mode !== 'active') return false
  const pass = process.env.SMTP_PASS || process.env.IMAP_PASSWORD || ''
  if (!pass) {
    log.step('smtp_missing', 'error', 'SMTP_PASS/IMAP_PASSWORD non défini')
    return false
  }
  const res = await sendSmtpMail({
    host: SMTP_HOST, port: SMTP_PORT, user: SMTP_USER, pass,
    from: SMTP_USER, to: ALERT_TO,
    subject: payload.subject, text: payload.text, html: payload.html,
  })
  if (!res.ok) {
    log.step('smtp_send', 'error', res.error || 'unknown')
    return false
  }
  return true
}

// ── Audit ───────────────────────────────────────────────────────────────

interface AuditOutcome {
  mode: AuditMode
  cse_configured: boolean
  total_terms: number
  total_competitors: number
  new_alerts: number
  email_sent: boolean
  per_term: TermOutcome[]
  summary: string
}

async function runAudit(log: AutomateLog): Promise<AuditOutcome> {
  const mode = getAuditMode(AUTOMATE_KEY)
  const apiKey = process.env.GOOGLE_CSE_API_KEY ?? ''
  const cseId  = process.env.GOOGLE_CSE_ID ?? ''
  const cseConfigured = Boolean(apiKey && cseId)

  const terms = await loadActiveTerms()
  log.count('terms_total', terms.length)

  if (!cseConfigured) {
    log.step('cse_missing', 'warning',
      'GOOGLE_CSE_API_KEY/GOOGLE_CSE_ID absents — squelette tourne, fetch SERP skippé')
  }

  const perTerm: TermOutcome[] = []
  let totalCompetitors = 0
  const allNewAlerts: { domain: string; url: string; invention: string; term: string }[] = []

  for (const t of terms) {
    const outcome: TermOutcome = {
      id_term: t.id_term, term: t.term, invention: t.invention,
      total_results: 0, our_results: 0, competitor_results: 0,
      competitors: [], new_alerts: [], error: '',
    }

    if (cseConfigured) {
      const { hits, error } = await searchCse(t.term, apiKey, cseId)
      outcome.error = error
      if (error) {
        log.step(`cse_error_term_${t.id_term}`, 'error', `${t.term}: ${error.slice(0, 200)}`)
      }
      const ours = hits.filter((h) => h.is_ours)
      const competitors = hits.filter((h) => !h.is_ours)
      outcome.total_results = hits.length
      outcome.our_results = ours.length
      outcome.competitor_results = competitors.length
      outcome.competitors = competitors.map((c) => ({ domain: c.domain, url: c.url }))

      const known = await loadKnownDomains(t.id_term)
      for (const c of competitors) {
        if (!known.has(c.domain)) {
          outcome.new_alerts.push({ domain: c.domain, url: c.url, invention: t.invention, term: t.term })
        }
        await upsertCompetitor(t.id_term, c.domain, c.url)
      }

      totalCompetitors += competitors.length
      log.step(`term_${t.id_term}`, outcome.new_alerts.length > 0 ? 'warning' : 'ok',
        `${t.term}: ${competitors.length} concurrent(s), ${outcome.new_alerts.length} nouveau(x)`)
    } else {
      log.step(`term_${t.id_term}`, 'skip', `[no-cse] ${t.term}`)
    }

    await updateTermStats(outcome)
    perTerm.push(outcome)
    allNewAlerts.push(...outcome.new_alerts)
    if (cseConfigured && terms.indexOf(t) < terms.length - 1) {
      await sleep(SLEEP_BETWEEN_TERMS_MS)
    }
  }

  let emailSent = false
  if (allNewAlerts.length > 0) {
    const payload = buildAlert(allNewAlerts)
    emailSent = await sendIfActive(mode, payload, log)
    if (!emailSent && mode === 'shadow') {
      log.step('email', 'skip', `[shadow] ${allNewAlerts.length} alert(s) prêt(s) — non envoyés`)
    }
  }

  log.count('competitors_total', totalCompetitors)
  log.count('new_alerts', allNewAlerts.length)
  if (emailSent) log.count('email_sent', 1)

  const summary = !cseConfigured
    ? `[no-cse] ${terms.length} terms scannés mais GOOGLE_CSE_* non configuré`
    : mode === 'shadow'
      ? `[shadow] ${terms.length} terms, ${totalCompetitors} concurrents, ${allNewAlerts.length} nouveau(x) — email non envoyé`
      : `${terms.length} terms, ${totalCompetitors} concurrents, ${allNewAlerts.length} nouveau(x), email=${emailSent ? 'sent' : 'skipped'}`

  return {
    mode, cse_configured: cseConfigured,
    total_terms: terms.length, total_competitors: totalCompetitors,
    new_alerts: allNewAlerts.length, email_sent: emailSent,
    per_term: perTerm, summary,
  }
}

// ── Persistance snapshot quotidien ──────────────────────────────────────

async function persistReport(outcome: AuditOutcome): Promise<void> {
  const sql = getPgClient()
  const dataJson = JSON.stringify({
    date: new Date().toISOString(),
    mode: outcome.mode,
    cse_configured: outcome.cse_configured,
    total_terms: outcome.total_terms,
    total_competitors: outcome.total_competitors,
    new_alerts: outcome.new_alerts,
    email_sent: outcome.email_sent,
    per_term: outcome.per_term,
  })

  await sql`
    DELETE FROM ${sql(PG_SCHEMA)}.cs_audit_reports
    WHERE report_type = 'brand_watch' AND report_date = CURRENT_DATE
  `
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_audit_reports
      (report_type, report_date, data_json, summary, date_add)
    VALUES
      ('brand_watch', CURRENT_DATE, ${dataJson}, ${outcome.summary.slice(0, 500)}, NOW())
  `
}

// ── Nitro Task entrypoint ───────────────────────────────────────────────

export default defineTask({
  meta: {
    name: 'audit:brand-watch',
    description: 'Surveillance SERP des inventions propriétaires via Google CSE (port ac_brand_watch, Wave 2)',
  },
  async run() {
    const skip = skipIfNotAcInternal('audit:brand-watch')
    if (skip) return { result: skip }
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock(AUTOMATE_KEY, async () => {
      return runAutomate(AUTOMATE_KEY, async (log) => {
        const outcome = await runAudit(log)
        await persistReport(outcome)
        const status = !outcome.cse_configured
          ? 'partial'
          : outcome.new_alerts > 0 ? 'partial' : 'ok'
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
