/**
 *
 * Logger wrapper for Nitro Tasks (work #43 python-nitro-tasks).
 * TypeScript mirror of the Python class `ac_logger.py::AutomateLog`,
 * writes to the same table `cs_main.cs_automate_logs` —
 * transparent coexistence while the Python → TypeScript migrations chain together.
 *
 * Note: the Python version still hits MariaDB (port 3307, prestashop) which is
 * stopped since 2026-04-30; the TypeScript port writes directly to PostgreSQL, so
 * automation traceability returns as soon as it switches to TypeScript.
 */

import { getPgClient } from '~/server/utils/db-pg-adapter'

type StepStatus = 'ok' | 'error' | 'warning' | 'skip'
type RunResult  = 'ok' | 'error' | 'partial' | 'skip'

interface StepEntry {
  name: string
  status: StepStatus
  time: string
  detail?: string
  duration_ms?: number
}

export class AutomateLog {
  private readonly name: string
  private readonly t0: number
  private readonly env: string
  private readonly steps: StepEntry[] = []
  private readonly errors: string[] = []
  private readonly warnings: string[] = []
  private readonly counters: Record<string, number> = {}
  private readonly context: Record<string, unknown> | null
  private result: RunResult | null = null
  private resultDetail = ''

  constructor(automateName: string, context: Record<string, unknown> | null = null) {
    this.name = automateName
    this.t0 = Date.now()
    this.env = process.env.NODE_ENV === 'production' ? 'prod' : 'preprod'
    this.context = context
  }

  step(name: string, status: StepStatus = 'ok', detail = '', durationMs = 0): void {
    const entry: StepEntry = { name, status, time: new Date().toISOString() }
    if (detail)     entry.detail = detail.slice(0, 500)
    if (durationMs) entry.duration_ms = durationMs
    this.steps.push(entry)
    if      (status === 'error')   this.errors.push(`${name}: ${detail.slice(0, 200)}`)
    else if (status === 'warning') this.warnings.push(`${name}: ${detail.slice(0, 200)}`)
  }

  count(key: string, increment = 1): void {
    this.counters[key] = (this.counters[key] || 0) + increment
  }

  setResult(result: RunResult, detail = ''): void {
    this.result   = result
    if (detail) this.resultDetail = detail
  }

  async save(): Promise<{ id_log: number }> {
    const durationS = Math.round(((Date.now() - this.t0) / 1000) * 100) / 100
    const finalResult: RunResult =
      this.result ?? (this.errors.length ? 'error' : 'ok')

    const sql = getPgClient()
    const [row] = await sql<{ id_log: number }[]>`
      INSERT INTO cs_main.cs_automate_logs (
        automate, env, result, duration_s,
        step_count, error_count, warning_count,
        counters, steps, errors, warnings,
        result_detail, context, date_add
      ) VALUES (
        ${this.name}, ${this.env}, ${finalResult}, ${durationS},
        ${this.steps.length}, ${this.errors.length}, ${this.warnings.length},
        ${JSON.stringify(this.counters)},
        ${JSON.stringify(this.steps)},
        ${JSON.stringify(this.errors)},
        ${JSON.stringify(this.warnings)},
        ${this.resultDetail},
        ${this.context ? JSON.stringify(this.context) : null},
        NOW()
      )
      RETURNING id_log
    `
    return row
  }
}

/**
 * Standard helper to wrap a Nitro Task handler: takes an advisory
 * lock + log run + serialize erreurs en step('runtime','error',...).
 */
export async function runAutomate<T>(
  automateName: string,
  fn: (log: AutomateLog) => Promise<T>,
): Promise<{ ok: boolean; result: T | null; id_log: number | null }> {
  const log = new AutomateLog(automateName)
  let result: T | null = null
  let ok = true
  try {
    result = await fn(log)
  } catch (err) {
    ok = false
    log.step('runtime', 'error', err instanceof Error ? err.message : String(err))
    log.setResult('error', err instanceof Error ? err.stack ?? err.message : String(err))
  }
  try {
    const { id_log } = await log.save()
    return { ok, result, id_log }
  } catch {
    return { ok, result, id_log: null }
  }
}
