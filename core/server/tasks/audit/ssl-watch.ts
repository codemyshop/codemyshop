/**
 *
 * Nitro Task — audit:ssl-watch
 *
 * Wave 4D Tier B1 of task #43. Port of `synedre/ac_ssl_check.py`
 * (cron 30 6 * * *). Checks the expiration date of TLS certificates
 * for 3 domains via native Node tls.connect (no openssl call).
 *
 * Persists a daily report in cs_audit_reports
 * (report_type='ssl_check'). Under AUDIT_MODE='active', logs an
 * incidents if a cert expires in <14 days (Let's Encrypt
 * Encrypt automatic but human alert if certbot crashed).
 *
 * AUDIT_MODE :
 * - 'shadow' (default): report persisted, no incidents
 * - 'active': INSERT incidents if days_left < THRESHOLD_ERROR
 */

import { defineTask } from 'nitropack/runtime'
import { TLSSocket, connect as tlsConnect } from 'node:tls'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate, type AutomateLog } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'
import { getAuditMode } from '~/server/utils/audit-mode'
import { skipIfNotAcInternal } from '~/server/utils/cron-context'

const PG_SCHEMA = 'cs_main'
const AUTOMATE_KEY = 'ac_ssl_check'
const TIMEOUT_MS = 15_000

const DOMAINS = [
  'codemyshop.com',
  'preprod.codemyshop.com',
  'codemyshop.com',
] as const

const THRESHOLD_WARNING = 30
const THRESHOLD_ERROR = 14

type SslStatus = 'OK' | 'WARNING' | 'ERROR'

interface SslResult {
  domain: string
  expires: string | null   // YYYY-MM-DD
  days_left: number | null
  status: SslStatus
  detail: string
}

async function pgSchemaExists(schema: string): Promise<boolean> {
  const sql = getPgClient()
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schema}
    ) AS exists
  `
  return rows[0]?.exists ?? false
}

function checkSslCertificate(domain: string): Promise<SslResult> {
  return new Promise((resolve) => {
    const result: SslResult = {
      domain,
      expires: null,
      days_left: null,
      status: 'ERROR',
      detail: '',
    }

    let socket: TLSSocket | null = null
    const timer = setTimeout(() => {
      result.detail = `timeout (${TIMEOUT_MS / 1000}s)`
      try { socket?.destroy() } catch { /* noop */ }
      resolve(result)
    }, TIMEOUT_MS)

    try {
      socket = tlsConnect({
        host: domain,
        port: 443,
        servername: domain,
        rejectUnauthorized: false, // on veut récupérer le cert même si chaîne invalide
      })
    } catch (e) {
      clearTimeout(timer)
      result.detail = `connect error: ${(e as Error).message}`
      resolve(result)
      return
    }

    socket.on('secureConnect', () => {
      clearTimeout(timer)
      const cert = socket!.getPeerCertificate()
      try { socket!.end() } catch { /* noop */ }
      if (!cert || !cert.valid_to) {
        result.detail = 'no certificate returned'
        resolve(result)
        return
      }
      const expiry = new Date(cert.valid_to)
      if (Number.isNaN(expiry.getTime())) {
        result.detail = `date parse error: ${cert.valid_to}`
        resolve(result)
        return
      }
      const now = Date.now()
      const daysLeft = Math.floor((expiry.getTime() - now) / 86_400_000)
      result.expires = expiry.toISOString().slice(0, 10)
      result.days_left = daysLeft
      if (daysLeft > THRESHOLD_WARNING) {
        result.status = 'OK'
      } else if (daysLeft >= THRESHOLD_ERROR) {
        result.status = 'WARNING'
        result.detail = `renouvellement dans ${daysLeft} jours`
      } else {
        result.status = 'ERROR'
        result.detail = `URGENT — expire dans ${daysLeft} jours`
      }
      resolve(result)
    })

    socket.on('error', (err) => {
      clearTimeout(timer)
      result.detail = `tls error: ${err.message}`
      try { socket?.destroy() } catch { /* noop */ }
      resolve(result)
    })
  })
}

async function persistReport(results: SslResult[], summary: string): Promise<void> {
  const sql = getPgClient()
  const data = JSON.stringify({
    last_run: new Date().toISOString(),
    domains: results,
  })
  await sql`
    DELETE FROM ${sql(PG_SCHEMA)}.cs_audit_reports
    WHERE report_type = 'ssl_check' AND report_date = CURRENT_DATE
  `
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_audit_reports
      (report_type, report_date, data_json, summary, date_add)
    VALUES ('ssl_check', CURRENT_DATE, ${data}, ${summary.slice(0, 500)}, NOW())
  `
}

async function maybeGraveCicatrice(results: SslResult[], mode: string): Promise<boolean> {
  if (mode !== 'active') return false
  const critical = results.filter((r) => r.status === 'ERROR')
  if (critical.length === 0) return false
  const sql = getPgClient()
  const desc = `${critical.length} certificat(s) SSL critique(s) : `
    + critical.map((r) => `${r.domain} (${r.detail})`).join(', ')
  const existing = await sql<{ id_cicatrice: number }[]>`
    SELECT id_cicatrice FROM ${sql(PG_SCHEMA)}.cs_cicatrices
    WHERE error_type = 'ssl' AND date_add::date = CURRENT_DATE LIMIT 1
  `
  if (existing[0]) return false
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_cicatrices
      (agent_codename, error_type, description, check_added, severity, resolved)
    VALUES ('securite', 'ssl', ${desc}, ${desc}, 'high', 0)
  `
  return true
}

export default defineTask({
  meta: {
    name: 'audit:ssl-watch',
    description: 'Audit quotidien expiration certificats TLS (port ac_ssl_check, Wave 4D Tier B1)',
  },
  async run() {
    const skip = skipIfNotAcInternal('audit:ssl-watch')
    if (skip) return { result: skip }
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock(AUTOMATE_KEY, async () => {
      return runAutomate(AUTOMATE_KEY, async (log: AutomateLog) => {
        const mode = getAuditMode(AUTOMATE_KEY)
        const results = await Promise.all(DOMAINS.map((d) => checkSslCertificate(d)))

        const okCount = results.filter((r) => r.status === 'OK').length
        const warningCount = results.filter((r) => r.status === 'WARNING').length
        const errorCount = results.filter((r) => r.status === 'ERROR').length

        log.count('ok', okCount)
        log.count('warning', warningCount)
        log.count('error', errorCount)

        const summary = (mode === 'shadow' ? '[shadow] ' : '')
          + `${results.length} domaines : ${okCount} OK, ${warningCount} WARNING, ${errorCount} ERROR`

        await persistReport(results, summary)
        const cicatriceGraved = await maybeGraveCicatrice(results, mode)
        if (cicatriceGraved) log.count('cicatrices_graved', 1)

        const status = errorCount > 0 ? 'partial' : 'ok'
        log.setResult(status, summary)
        return { status, mode, results, cicatriceGraved, summary }
      })
    })

    if (!lockResult.acquired) {
      return { result: { status: 'skipped', reason: 'lock-held-by-other-instance' } }
    }
    return { result: lockResult.result }
  },
})
