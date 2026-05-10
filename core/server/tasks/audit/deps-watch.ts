/**
 *
 * Nitro Task — audit:deps-watch
 *
 * Wave 4A of work #43. Port of `ac_deps_audit.py` (cron Thursday 2h UTC).
 * Scans vulnerabilities and outdated npm packages in the runtime container
 * (/app/package.json + /app/package-lock.json) via `npm audit --json` and
 * `npm outdated --json`. Persists a daily report (1 row per run) in
 * `cs_audit_reports` (DB-Only).
 *
 * Note: the Python port also scanned pip (automation/.venv) — dropped here because
 * Python is being phased out (work #43). If pip-audit is needed again in the future, open a
 * dedicated work item.
 *
 * AUDIT_MODE :
 * - 'shadow' (default) : report persisted, no severe incidents logged
 * - 'active'           : INSERT incidents if critical > 0
 */

import { defineTask } from 'nitropack/runtime'
import { spawn } from 'node:child_process'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'
import { getAuditMode } from '~/server/utils/audit-mode'
import { skipIfNotAcInternal } from '~/server/utils/cron-context'

const PG_SCHEMA = 'cs_main'
const AUTOMATE_KEY = 'ac_deps_audit'
const NPM_CWD = '/app'
const TIMEOUT_MS = 60_000

type NpmAudit = {
  critical: number
  high: number
  moderate: number
  low: number
  error: string | null
}

type NpmOutdated = {
  count: number
  packages: string[]
  error: string | null
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

function runNpm(args: string[], cwd: string, timeoutMs = TIMEOUT_MS): Promise<{ stdout: string; code: number | null }> {
  return new Promise((resolve) => {
    const proc = spawn('npm', args, { cwd, env: process.env })
    const chunks: Buffer[] = []
    const timer = setTimeout(() => proc.kill('SIGTERM'), timeoutMs)
    proc.stdout.on('data', (c: Buffer) => chunks.push(c))
    proc.stderr.on('data', () => {})
    proc.on('close', (code) => {
      clearTimeout(timer)
      resolve({ stdout: Buffer.concat(chunks).toString('utf8'), code })
    })
    proc.on('error', () => {
      clearTimeout(timer)
      resolve({ stdout: '', code: -1 })
    })
  })
}

async function auditNpm(): Promise<NpmAudit> {
  const result: NpmAudit = { critical: 0, high: 0, moderate: 0, low: 0, error: null }
  const { stdout, code } = await runNpm(['audit', '--json'], NPM_CWD)
  // npm audit exit code != 0 si vulnérabilités, mais le JSON est valide
  if (code === -1) { result.error = 'spawn failed'; return result }
  if (!stdout) { result.error = 'empty output'; return result }
  try {
    const data = JSON.parse(stdout) as any
    const v = data?.metadata?.vulnerabilities
    if (v) {
      result.critical = Number(v.critical ?? 0)
      result.high = Number(v.high ?? 0)
      result.moderate = Number(v.moderate ?? 0)
      result.low = Number(v.low ?? 0)
    }
  } catch {
    result.error = 'invalid JSON'
  }
  return result
}

async function npmOutdated(): Promise<NpmOutdated> {
  const result: NpmOutdated = { count: 0, packages: [], error: null }
  const { stdout, code } = await runNpm(['outdated', '--json'], NPM_CWD, 30_000)
  // npm outdated exit code 1 si outdated, 0 sinon — JSON OK dans les deux cas
  if (code === -1) { result.error = 'spawn failed'; return result }
  if (!stdout) return result
  try {
    const data = JSON.parse(stdout) as Record<string, { current?: string; latest?: string }>
    const entries = Object.entries(data)
    result.count = entries.length
    result.packages = entries.slice(0, 10).map(([name, info]) => `${name}: ${info.current ?? '?'} → ${info.latest ?? '?'}`)
  } catch {
    result.error = 'invalid JSON'
  }
  return result
}

async function persistReport(audit: NpmAudit, outdated: NpmOutdated, summary: string): Promise<void> {
  const sql = getPgClient()
  const data = JSON.stringify({
    last_run: new Date().toISOString(),
    npm_audit: audit,
    npm_outdated: outdated,
  })
  await sql`
    DELETE FROM ${sql(PG_SCHEMA)}.cs_audit_reports
    WHERE report_type = 'deps_audit' AND report_date = CURRENT_DATE
  `
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_audit_reports
      (report_type, report_date, data_json, summary, date_add)
    VALUES ('deps_audit', CURRENT_DATE, ${data}, ${summary.slice(0, 500)}, NOW())
  `
}

async function maybeGraveCicatrice(audit: NpmAudit, mode: string): Promise<boolean> {
  if (mode !== 'active') return false
  if (audit.critical === 0) return false
  const sql = getPgClient()
  const desc = `${audit.critical} CRITICAL npm vulnerabilities — run \`npm audit fix\``
  const existing = await sql<{ id_cicatrice: number }[]>`
    SELECT id_cicatrice FROM ${sql(PG_SCHEMA)}.cs_cicatrices
    WHERE error_type = 'deps' AND date_add::date = CURRENT_DATE LIMIT 1
  `
  if (existing[0]) return false
  await sql`
    INSERT INTO ${sql(PG_SCHEMA)}.cs_cicatrices
      (agent_codename, error_type, description, check_added, severity, resolved)
    VALUES ('securite', 'deps', ${desc}, ${desc}, 'high', 0)
  `
  return true
}

export default defineTask({
  meta: {
    name: 'audit:deps-watch',
    description: 'Audit hebdo vulnérabilités npm + obsolescences (port ac_deps_audit, Wave 4A)',
  },
  async run() {
    const skip = skipIfNotAcInternal('audit:deps-watch')
    if (skip) return { result: skip }
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock(AUTOMATE_KEY, async () => {
      return runAutomate(AUTOMATE_KEY, async (log) => {
        const mode = getAuditMode(AUTOMATE_KEY)
        const audit = await auditNpm()
        const outdated = await npmOutdated()

        log.count('critical', audit.critical)
        log.count('high', audit.high)
        log.count('moderate', audit.moderate)
        log.count('low', audit.low)
        log.count('outdated', outdated.count)

        const summaryParts: string[] = []
        if (audit.error) summaryParts.push(`audit error: ${audit.error}`)
        else summaryParts.push(`vulns C${audit.critical}/H${audit.high}/M${audit.moderate}/L${audit.low}`)
        summaryParts.push(`outdated ${outdated.count}`)
        const summary = (mode === 'shadow' ? '[shadow] ' : '') + summaryParts.join(', ')

        await persistReport(audit, outdated, summary)
        const cicatriceGraved = await maybeGraveCicatrice(audit, mode)
        if (cicatriceGraved) log.count('cicatrices_graved', 1)

        const status = audit.error ? 'partial' : audit.critical > 0 ? 'partial' : 'ok'
        log.setResult(status, summary)
        return { status, mode, audit, outdated, cicatriceGraved, summary }
      })
    })

    if (!lockResult.acquired) {
      return { result: { status: 'skipped', reason: 'lock-held-by-other-instance' } }
    }
    return { result: lockResult.result }
  },
})
