

import { defineTask } from 'nitropack/runtime'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'
import { processEmailQueue } from '~/server/utils/email-queue'

const PG_SCHEMA = 'cs_main'
const AUTOMATE_KEY = 'ac_email_queue'
const BATCH_LIMIT = 1

async function pgSchemaExists(schema: string): Promise<boolean> {
  const sql = getPgClient()
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schema}
    ) AS exists
  `
  return rows[0]?.exists ?? false
}

export default defineTask({
  meta: {
    name: 'email:queue-process',
    description: 'Drain cs_email_queue (1 email/run, anti-spam-ban)',
  },
  async run() {
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock(AUTOMATE_KEY, async () => {
      return runAutomate(AUTOMATE_KEY, async (log) => {
        const outcome = await processEmailQueue({ limit: BATCH_LIMIT })
        log.count('scanned',   outcome.scanned)
        log.count('processed', outcome.processed)
        log.count('errors',    outcome.errors)

        const summary =
          outcome.scanned === 0
            ? 'queue empty'
            : `${outcome.processed}/${outcome.scanned} ok, ${outcome.errors} err`
        const status = outcome.errors > 0 ? 'partial' : 'ok'
        log.setResult(status, summary)

        return {
          status,
          scanned:   outcome.scanned,
          processed: outcome.processed,
          errors:    outcome.errors,
          items:     outcome.items,
          summary,
        }
      })
    })

    if (!lockResult.acquired) {
      return { result: { status: 'skipped', reason: 'lock-held-by-other-instance' } }
    }
    return { result: lockResult.result }
  },
})
