/**
 *
 * Nitro Task — audit:matomo-watch
 *
 * Wave 1A.5 of work #43 (python-nitro-tasks). Port of
 * `synedre/ac_matomo_check.py` (cron quotidien 08:00 UTC).
 * Checks for each tracked site : (1) Matomo API is reachable,
 * (2) visits from the last 3 days (broken tracker detection),
 * (3) JS tracker is present in the homepage HTML,
 * (4) Fleet consistency (cs_client_vps) ↔ Matomo sites.
 *
 * Stockage DB-only : INSERT idempotent cs_audit_reports
 * (report_type='matomo_check', 1 row/jour).
 */

import { defineTask } from 'nitropack/runtime'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate, type AutomateLog } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'
import { skipIfNotAcInternal } from '~/server/utils/cron-context'

const PG_SCHEMA  = 'cs_main'
const USER_AGENT = 'AC-MatomoCheck/2.0 (Nitro Task)'
const FETCH_TIMEOUT_MS = 15_000

interface Site {
  name: string
  url: string
  site_id: number
}

const STATIC_SITES: readonly Site[] = [
  { name: 'CodeMyShop', url: 'https://codemyshop.com', site_id: 1 },
] as const

interface SiteIssue {
  site: string
  kind: 'visits' | 'tracker' | 'fleet'
  detail: string
}

interface SiteSnapshot {
  name: string
  site_id: number
  url: string
  visits_3d: number
  zero_days: number
  tracker_patterns: number
  status: 'ok' | 'warn' | 'error'
}

// ── Guard schema ─────────────────────────────────────────────────────────

async function pgSchemaExists(schema: string): Promise<boolean> {
  const sql = getPgClient()
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schema}
    ) AS exists
  `
  return Boolean(rows[0]?.exists)
}

// ── HTTP helpers ─────────────────────────────────────────────────────────

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

async function matomoApi<T = unknown>(
  matomoUrl: string,
  token: string,
  method: string,
  params: Record<string, string | number> = {},
): Promise<T | null> {
  try {
    const body = new URLSearchParams({
      module: 'API',
      method,
      format: 'json',
      token_auth: token,
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    })
    const res = await fetchWithTimeout(`${matomoUrl}/index.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

// ── Fleet (cs_client_vps) ─────────────────────────────────────────────

async function loadClientSites(): Promise<Site[]> {
  // Note port 2026-05-01 : cs_client_vps post-cutover MariaDB→PG (chantier
  // #38 step 7) n'a PAS la colonne matomo_site_id que le Python attendait.
  // Le Python silencieusement try/except → return []. Parité shadow stricte :
  // on reproduit ce comportement, à corriger dans une Wave 1 actif (ajout
  // colonne + back-fill depuis Matomo SitesManager).
  try {
    const sql = getPgClient()
    const rows = await sql<{ client_id: string; domain: string; matomo_site_id: number }[]>`
      SELECT client_id, domain, matomo_site_id
      FROM ${sql(PG_SCHEMA)}.cs_client_vps
      WHERE active = 1 AND domain IS NOT NULL AND domain <> ''
    `
    return rows
      .filter((r) => r.matomo_site_id !== null && r.matomo_site_id !== undefined)
      .map((r) => ({
        name:    r.client_id,
        url:     `https://${r.domain}`,
        site_id: Number(r.matomo_site_id),
      }))
  } catch {
    return []
  }
}

// ── Checks ───────────────────────────────────────────────────────────────

async function checkApiHealth(
  matomoUrl: string, token: string, log: AutomateLog,
): Promise<boolean> {
  const ts = Date.now()
  const r = await matomoApi<{ value?: string }>(matomoUrl, token, 'API.getMatomoVersion')
  const dur = Date.now() - ts
  if (r && typeof r === 'object' && 'value' in r && r.value) {
    log.step('matomo_api_health', 'ok', `Matomo v${r.value}`, dur)
    return true
  }
  log.step('matomo_api_health', 'error', 'Matomo API inaccessible', dur)
  return false
}

interface VisitsByDay { [day: string]: { nb_visits?: number } }

async function checkSiteVisits(
  matomoUrl: string, token: string, site: Site, log: AutomateLog,
): Promise<{ snapshot: Pick<SiteSnapshot, 'visits_3d' | 'zero_days'>; issues: SiteIssue[] }> {
  const ts = Date.now()
  const data = await matomoApi<VisitsByDay>(matomoUrl, token, 'VisitsSummary.get', {
    idSite: site.site_id, period: 'day', date: 'last3',
  })
  const dur = Date.now() - ts
  const issues: SiteIssue[] = []

  if (!data) {
    log.step(`visits_${site.name}`, 'error', 'API inaccessible', dur)
    issues.push({ site: site.name, kind: 'visits', detail: 'API inaccessible' })
    return { snapshot: { visits_3d: 0, zero_days: 3 }, issues }
  }

  let zeroDays = 0
  let total = 0
  let today = 0
  const todayStr = new Date().toISOString().slice(0, 10)
  for (const [day, stats] of Object.entries(data)) {
    const v = stats?.nb_visits ?? 0
    total += v
    if (day === todayStr) today = v
    if (v === 0) zeroDays += 1
  }

  if (today > 0 && zeroDays >= 2) {
    log.step(`visits_${site.name}`, 'warning',
      `${total} visites 3j, trou passé mais tracker OK aujourd'hui (${today})`, dur)
  } else if (zeroDays >= 2) {
    const msg = `0 visites depuis ${zeroDays}j — tracker probablement cassé`
    log.step(`visits_${site.name}`, 'error', msg, dur)
    issues.push({ site: site.name, kind: 'visits', detail: msg })
  } else if (zeroDays === 1) {
    log.step(`visits_${site.name}`, 'warning', `${total} visites 3j, 1j vide`, dur)
  } else {
    log.step(`visits_${site.name}`, 'ok', `${total} visites 3j`, dur)
  }

  return { snapshot: { visits_3d: total, zero_days: zeroDays }, issues }
}

const TRACKER_PATTERNS: readonly RegExp[] = [
  /matomo\.js/i,
  /matomo\.php/i,
  /_paq\.push/i,
  /analytics\.alexandrecarette\.fr/i,
  /idsite.*=.*\d+/i,
] as const

async function checkTrackerJs(
  site: Site, log: AutomateLog,
): Promise<{ patterns: number; issues: SiteIssue[] }> {
  const ts = Date.now()
  const issues: SiteIssue[] = []
  try {
    const res = await fetchWithTimeout(site.url, { timeoutMs: 15_000 })
    const html = await res.text()
    const found = TRACKER_PATTERNS.filter((p) => p.test(html)).length
    const dur = Date.now() - ts

    if (found === 0) {
      log.step(`tracker_${site.name}`, 'error', 'Tracker JS Matomo ABSENT', dur)
      issues.push({ site: site.name, kind: 'tracker', detail: 'Tracker JS Matomo ABSENT du HTML' })
    } else if (found < 2) {
      log.step(`tracker_${site.name}`, 'warning', `Tracker partiel (${found} patterns)`, dur)
    } else {
      log.step(`tracker_${site.name}`, 'ok', `Tracker OK (${found} patterns)`, dur)
    }
    return { patterns: found, issues }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.step(`tracker_${site.name}`, 'error', `Page inaccessible: ${msg}`, Date.now() - ts)
    issues.push({ site: site.name, kind: 'tracker', detail: `Page inaccessible: ${msg}` })
    return { patterns: 0, issues }
  }
}

interface MatomoSiteEntry { main_url?: string }

async function checkFleetSync(
  matomoUrl: string, token: string, fleetSites: Site[], log: AutomateLog,
): Promise<SiteIssue[]> {
  const ts = Date.now()
  const raw = await matomoApi<MatomoSiteEntry[] | Record<string, MatomoSiteEntry>>(
    matomoUrl, token, 'SitesManager.getAllSites',
  )
  const dur = Date.now() - ts

  if (!raw || (typeof raw === 'object' && !Array.isArray(raw) && 'result' in raw)) {
    log.step('fleet_sync', 'warning', 'Impossible de lire les sites Matomo', dur)
    return []
  }

  const matomoUrls = new Set<string>()
  if (Array.isArray(raw)) {
    for (const ms of raw) if (ms?.main_url) matomoUrls.add(ms.main_url)
  } else {
    for (const ms of Object.values(raw)) if (ms?.main_url) matomoUrls.add(ms.main_url)
  }

  const missing = fleetSites.filter((s) => !matomoUrls.has(s.url)).map((s) => s.name)
  if (missing.length > 0) {
    const detail = `${missing.length} site(s) sans Matomo: ${missing.join(', ')}`
    log.step('fleet_sync', 'warning', detail, dur)
    return missing.map((name) => ({ site: name, kind: 'fleet', detail: 'Site Flotte sans entrée Matomo' }))
  }
  log.step('fleet_sync', 'ok', `${matomoUrls.size} sites Matomo OK`, dur)
  return []
}

// ── Audit principal ──────────────────────────────────────────────────────

interface AuditOutcome {
  api_ok: boolean
  sites: SiteSnapshot[]
  issues: SiteIssue[]
  summary: string
}

async function runAudit(log: AutomateLog): Promise<AuditOutcome> {
  const matomoUrl = process.env.MATOMO_URL ?? 'https://analytics.codemyshop.com'
  const token     = process.env.MATOMO_AUTH_TOKEN ?? ''

  if (!token) {
    log.step('config', 'error', 'MATOMO_AUTH_TOKEN manquant')
    return { api_ok: false, sites: [], issues: [], summary: 'MATOMO_AUTH_TOKEN absent — audit impossible' }
  }

  const apiOk = await checkApiHealth(matomoUrl, token, log)
  if (!apiOk) {
    return { api_ok: false, sites: [], issues: [
      { site: '*', kind: 'visits', detail: 'API Matomo inaccessible — audit interrompu' },
    ], summary: 'API Matomo inaccessible' }
  }

  const fleet = await loadClientSites()
  const sites: Site[] = [...STATIC_SITES, ...fleet]
  log.count('sites_to_check', sites.length)

  const snapshots: SiteSnapshot[] = []
  const issues: SiteIssue[] = []

  for (const site of sites) {
    const v = await checkSiteVisits(matomoUrl, token, site, log)
    const t = await checkTrackerJs(site, log)
    issues.push(...v.issues, ...t.issues)
    const status: SiteSnapshot['status'] =
      v.issues.length || t.issues.length ? 'error'
        : v.snapshot.zero_days >= 1 || t.patterns < 2 ? 'warn'
          : 'ok'
    snapshots.push({
      name: site.name, site_id: site.site_id, url: site.url,
      visits_3d: v.snapshot.visits_3d, zero_days: v.snapshot.zero_days,
      tracker_patterns: t.patterns, status,
    })
  }

  const fleetIssues = await checkFleetSync(matomoUrl, token, fleet, log)
  issues.push(...fleetIssues)

  log.count('issues_total', issues.length)
  log.count('sites_checked', sites.length)
  const summary = issues.length > 0
    ? `${issues.length} problème(s) sur ${sites.length} site(s)`
    : `Tous les sites OK (${sites.length})`

  return { api_ok: true, sites: snapshots, issues, summary }
}

// ── Persistance DB-only ──────────────────────────────────────────────────

async function persistReport(outcome: AuditOutcome): Promise<void> {
  const sql = getPgClient()
  const dataJson = JSON.stringify({
    date: new Date().toISOString(),
    api_ok: outcome.api_ok,
    sites: outcome.sites,
    issues: outcome.issues,
    counts: {
      total:    outcome.issues.length,
      visits:   outcome.issues.filter((i) => i.kind === 'visits').length,
      tracker:  outcome.issues.filter((i) => i.kind === 'tracker').length,
      fleet:    outcome.issues.filter((i) => i.kind === 'fleet').length,
    },
  })

  await sql`
    DELETE FROM ${sql(PG_SCHEMA)}.cs_audit_reports
    WHERE report_type = 'matomo_check' AND report_date = CURRENT_DATE
  `
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_audit_reports
      (report_type, report_date, data_json, summary, date_add)
    VALUES
      ('matomo_check', CURRENT_DATE, ${dataJson}, ${outcome.summary.slice(0, 500)}, NOW())
  `
}

// ── Nitro Task entrypoint ────────────────────────────────────────────────

export default defineTask({
  meta: {
    name: 'audit:matomo-watch',
    description: 'Surveillance trackers Matomo (port ac_matomo_check, Wave 1A.5)',
  },
  async run() {
    const skip = skipIfNotAcInternal('audit:matomo-watch')
    if (skip) return { result: skip }
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock('ac_matomo_check', async () => {
      return runAutomate('ac_matomo_check', async (log) => {
        const outcome = await runAudit(log)
        await persistReport(outcome)
        const status = !outcome.api_ok ? 'error'
          : outcome.issues.length > 0 ? 'partial' : 'ok'
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
