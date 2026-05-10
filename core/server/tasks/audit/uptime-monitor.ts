/**
 *
 * Nitro Task — audit:uptime-monitor
 *
 * Wave 1 high-freq (final phase of Wave 1) of task #43. Port
 * of `synedre/ac_clients_uptime_monitor.py` (cron every 3 min).
 *
 * Checks HEAD https://<domain>/ for each active prod VPS
 * (cs_client_vps WHERE purpose='production' AND active=1). Maintient
 * a consecutive failure counter. Beyond the threshold, triggers an
 * email alert then a recovery email on return.
 *
 * DB-Only :
 *  - Live state         → cs_uptime_state (1 row par client)
 *  - Snapshot quotidien → cs_audit_reports (report_type='clients_uptime')
 * - No more JSON FS (the old synedre/state/clients_uptime.json
 * remains written by the Python cron during shadow).
 *
 * AUDIT_MODE :
 * - 'shadow' (default): checks run, state DB persisted, snapshot
 * persisted, NO email sent. The Python cron
 * remains source of truth for alerting during
 * shadow (it has its own state JSON FS which
 * does not conflict with the TS table).
 * - 'active': alert/recovery emails effective. The Python cron
 * Python must be disabled in parallel to
 * avoid double sending.
 */

import { defineTask } from 'nitropack/runtime'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate, type AutomateLog } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'
import { getAuditMode, type AuditMode } from '~/server/utils/audit-mode'
import { sendSmtpMail } from '~/server/utils/smtp'
import { skipIfNotAcInternal } from '~/server/utils/cron-context'

const PG_SCHEMA = 'cs_main'
const AUTOMATE_KEY = 'ac_clients_uptime_monitor'

const UP_CODES: ReadonlySet<number> = new Set([200, 301, 302, 401, 403])
const FAILS_BEFORE_ALERT = 2     // 2 échecs consécutifs = ~6 min de prod down
const HTTP_TIMEOUT_MS = 10_000

const SMTP_HOST = 'ssl0.ovh.net'
const SMTP_PORT = 465
const SMTP_USER = process.env.IMAP_USER || 'contact@codemyshop.com'
const ALERT_TO  = process.env.UPTIME_ALERT_TO || 'contact@codemyshop.com'

interface ClientRow {
  client_id: string
  label: string
  domain: string
  critical: boolean
  mrr: number
}

interface StateRow {
  client_id: string
  domain: string
  label: string
  critical: boolean
  current_status: 'up' | 'down' | 'unknown'
  last_http_code: number | null
  last_check: Date | null
  consecutive_fails: number
  down_since: Date | null
  alerted: boolean
}

interface CheckOutcome {
  client: ClientRow
  http_code: number       // 0 = connexion impossible
  is_up: boolean
  error: string
  prev: StateRow | null
  next: StateRow
  alert_sent: boolean
  recovery_sent: boolean
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

async function fetchClients(): Promise<ClientRow[]> {
  const sql = getPgClient()
  const rows = await sql<{
    client_id: string
    label: string | null
    domain: string | null
    critical: number | null
    mrr: number | null
  }[]>`
    SELECT client_id, label, domain, critical, mrr
    FROM ${sql(PG_SCHEMA)}.cs_client_vps
    WHERE purpose = 'production'
      AND active = 1
      AND domain IS NOT NULL
      AND domain <> ''
    ORDER BY critical DESC, mrr DESC, client_id
  `
  return rows.map((r) => ({
    client_id: String(r.client_id),
    label: r.label ?? '',
    domain: r.domain ?? '',
    critical: Number(r.critical ?? 0) === 1,
    mrr: Number(r.mrr ?? 0),
  }))
}

async function loadState(clientIds: string[]): Promise<Map<string, StateRow>> {
  const map = new Map<string, StateRow>()
  if (clientIds.length === 0) return map
  const sql = getPgClient()
  const rows = await sql<{
    client_id: string
    domain: string
    label: string
    critical: number
    current_status: string
    last_http_code: number | null
    last_check: Date | null
    consecutive_fails: number
    down_since: Date | null
    alerted: number
  }[]>`
    SELECT client_id, domain, label, critical, current_status,
           last_http_code, last_check, consecutive_fails, down_since, alerted
    FROM ${sql(PG_SCHEMA)}.cs_uptime_state
    WHERE client_id IN ${sql(clientIds)}
  `
  for (const r of rows) {
    map.set(r.client_id, {
      client_id: r.client_id,
      domain: r.domain,
      label: r.label,
      critical: Number(r.critical) === 1,
      current_status: (r.current_status as StateRow['current_status']) || 'unknown',
      last_http_code: r.last_http_code,
      last_check: r.last_check,
      consecutive_fails: Number(r.consecutive_fails) || 0,
      down_since: r.down_since,
      alerted: Number(r.alerted) === 1,
    })
  }
  return map
}

async function upsertState(state: StateRow): Promise<void> {
  const sql = getPgClient()
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_uptime_state (
      client_id, domain, label, critical, current_status,
      last_http_code, last_check, consecutive_fails, down_since, alerted,
      date_add, date_upd
    ) VALUES (
      ${state.client_id}, ${state.domain}, ${state.label},
      ${state.critical ? 1 : 0}, ${state.current_status},
      ${state.last_http_code}, ${state.last_check},
      ${state.consecutive_fails}, ${state.down_since},
      ${state.alerted ? 1 : 0},
      NOW(), NOW()
    )
    ON CONFLICT (client_id) DO UPDATE SET
      domain            = EXCLUDED.domain,
      label             = EXCLUDED.label,
      critical          = EXCLUDED.critical,
      current_status    = EXCLUDED.current_status,
      last_http_code    = EXCLUDED.last_http_code,
      last_check        = EXCLUDED.last_check,
      consecutive_fails = EXCLUDED.consecutive_fails,
      down_since        = EXCLUDED.down_since,
      alerted           = EXCLUDED.alerted,
      date_upd          = NOW()
  `
}

// ── HTTP check ──────────────────────────────────────────────────────────

async function checkHttp(domain: string): Promise<{ code: number; error: string }> {
  const url = `https://${domain}/`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'ac_clients_uptime_monitor/2.0' },
    })
    return { code: res.status, error: '' }
  } catch (e) {
    const err = e as { name?: string; message?: string }
    return { code: 0, error: `${err.name ?? 'Error'}: ${err.message ?? String(e)}` }
  } finally {
    clearTimeout(timer)
  }
}

// ── Email senders ───────────────────────────────────────────────────────

function buildAlert(client: ClientRow, code: number, error: string, state: StateRow):
  { subject: string; text: string; html: string } {
  const codeStr = code ? String(code) : 'CONNECTION FAILED'
  const critTag = client.critical ? '🔴 CRITIQUE' : '🟠 NON-CRITIQUE'
  const downSince = state.down_since ? state.down_since.toISOString() : '?'
  const fails = state.consecutive_fails
  const subject = `[AC UPTIME] 🚨 ${client.label} DOWN — HTTP ${codeStr}`
  const text = `ALERTE UPTIME — Site client en panne

Client       : ${client.label}
Domaine      : https://${client.domain}/
Priorité     : ${critTag}
MRR          : ${client.mrr} €/mois
HTTP code    : ${codeStr}
Erreur       : ${error || '(aucune, code HTTP retourné)'}
Échecs       : ${fails} checks consécutifs (= ~${fails * 3} min de prod down)
Down depuis  : ${downSince}

Action immédiate suggérée :
1. curl -I https://${client.domain}/
2. ssh ubuntu@<vps_ip> (cf cs_client_vps WHERE client_id='${client.client_id}')
3. docker logs <web_container> --tail 100
4. Vérifier var/cache (incidents ps_cache_clear_perms si PrestaShop)

Cet email a été envoyé par audit:uptime-monitor (Nitro Task #43 Wave 1).
État complet : SELECT * FROM cs_main.cs_uptime_state WHERE client_id='${client.client_id}';
`
  return { subject, text, html: `<pre>${text}</pre>` }
}

function buildRecovery(client: ClientRow, code: number, state: StateRow):
  { subject: string; text: string; html: string } {
  const downSince = state.down_since ? state.down_since.toISOString() : '?'
  const subject = `[AC UPTIME] ✅ ${client.label} RECOVERED — HTTP ${code}`
  const text = `RÉTABLISSEMENT — Site client rétabli

Client       : ${client.label}
Domaine      : https://${client.domain}/
HTTP code    : ${code}
Down depuis  : ${downSince}
Recovery     : ${new Date().toISOString()}

Le site répond à nouveau correctement. Penser à investiguer la cause profonde et à graver une incidents si l'incident est nouveau.
`
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
  total_clients: number
  ups: number
  downs: number
  alerts_sent: number
  recoveries_sent: number
  results: CheckOutcome[]
  summary: string
}

async function runAudit(log: AutomateLog): Promise<AuditOutcome> {
  const mode = getAuditMode(AUTOMATE_KEY)
  const clients = await fetchClients()
  log.count('clients_total', clients.length)

  const stateMap = await loadState(clients.map((c) => c.client_id))
  const checked = await Promise.all(clients.map(async (c) => {
    const { code, error } = await checkHttp(c.domain)
    return { client: c, code, error, prev: stateMap.get(c.client_id) ?? null }
  }))

  const results: CheckOutcome[] = []
  let ups = 0, downs = 0, alerts = 0, recoveries = 0
  const now = new Date()

  for (const { client, code, error, prev } of checked) {
    const isUp = UP_CODES.has(code)
    const next: StateRow = {
      client_id:    client.client_id,
      domain:       client.domain,
      label:        client.label,
      critical:     client.critical,
      current_status: isUp ? 'up' : 'down',
      last_http_code: code || null,
      last_check:   now,
      consecutive_fails: isUp ? 0 : ((prev?.consecutive_fails ?? 0) + 1),
      down_since:   isUp ? null : (prev?.down_since ?? now),
      alerted:      isUp ? false : (prev?.alerted ?? false),
    }

    let alertSent = false
    let recoverySent = false

    if (isUp) {
      ups += 1
      if (prev?.alerted) {
        const payload = buildRecovery(client, code, prev)
        recoverySent = await sendIfActive(mode, payload, log)
        if (recoverySent) {
          recoveries += 1
          log.step(`recovery_${client.client_id}`, 'ok', `HTTP ${code}`)
        } else if (mode === 'shadow') {
          log.step(`recovery_${client.client_id}`, 'skip', `[shadow] would send recovery HTTP ${code}`)
        }
      }
    } else {
      downs += 1
      const shouldAlert = next.consecutive_fails >= FAILS_BEFORE_ALERT && !next.alerted
      if (shouldAlert) {
        const payload = buildAlert(client, code, error, next)
        alertSent = await sendIfActive(mode, payload, log)
        if (alertSent) {
          alerts += 1
          next.alerted = true
          log.step(`alert_sent_${client.client_id}`, 'warning',
            `HTTP ${code} | ${next.consecutive_fails} fails`)
        } else if (mode === 'shadow') {
          log.step(`alert_${client.client_id}`, 'skip',
            `[shadow] would alert HTTP ${code} | ${next.consecutive_fails} fails`)
        }
      } else {
        log.step(`down_${client.client_id}`, 'warning',
          `HTTP ${code} | fails=${next.consecutive_fails}`)
      }
    }

    await upsertState(next)
    results.push({ client, http_code: code, is_up: isUp, error, prev, next, alert_sent: alertSent, recovery_sent: recoverySent })
  }

  log.count('ups', ups)
  log.count('downs', downs)
  log.count('alerts_sent', alerts)
  log.count('recoveries_sent', recoveries)

  const summary = mode === 'shadow'
    ? `[shadow] ${ups}/${clients.length} up, ${downs} down (alerts/recoveries non envoyés)`
    : `${ups}/${clients.length} up, ${downs} down, ${alerts} alerts, ${recoveries} recoveries`

  return { mode, total_clients: clients.length, ups, downs, alerts_sent: alerts, recoveries_sent: recoveries, results, summary }
}

// ── Persistance snapshot quotidien ──────────────────────────────────────

async function persistReport(outcome: AuditOutcome): Promise<void> {
  const sql = getPgClient()
  const dataJson = JSON.stringify({
    last_run: new Date().toISOString(),
    mode: outcome.mode,
    total_clients: outcome.total_clients,
    ups: outcome.ups,
    downs: outcome.downs,
    alerts_sent: outcome.alerts_sent,
    recoveries_sent: outcome.recoveries_sent,
    clients: outcome.results.map((r) => ({
      client_id: r.client.client_id,
      label: r.client.label,
      domain: r.client.domain,
      critical: r.client.critical,
      http_code: r.http_code,
      is_up: r.is_up,
      error: r.error,
      consecutive_fails: r.next.consecutive_fails,
      alert_sent: r.alert_sent,
      recovery_sent: r.recovery_sent,
    })),
  })

  await sql`
    DELETE FROM ${sql(PG_SCHEMA)}.cs_audit_reports
    WHERE report_type = 'clients_uptime' AND report_date = CURRENT_DATE
  `
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_audit_reports
      (report_type, report_date, data_json, summary, date_add)
    VALUES
      ('clients_uptime', CURRENT_DATE, ${dataJson}, ${outcome.summary.slice(0, 500)}, NOW())
  `
}

// ── Nitro Task entrypoint ───────────────────────────────────────────────

export default defineTask({
  meta: {
    name: 'audit:uptime-monitor',
    description: 'Monitoring HTTP 3-min sites clients prod (port ac_clients_uptime_monitor, Wave 1 high-freq)',
  },
  async run() {
    const skip = skipIfNotAcInternal('audit:uptime-monitor')
    if (skip) return { result: skip }
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock(AUTOMATE_KEY, async () => {
      return runAutomate(AUTOMATE_KEY, async (log) => {
        const outcome = await runAudit(log)
        await persistReport(outcome)
        const status = outcome.downs > 0 ? 'partial' : 'ok'
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
