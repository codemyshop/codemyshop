/**
 *
 * Nitro Task — cover:queue-process
 *
 * Wave 3 #3 Phase D of task #43. Consumer of cs_covergen_queue which
 * replaces `synedre/ac_covergen.py --process-queue` (runs every 5 minutes).
 *
 * Pattern : claim FOR UPDATE SKIP LOCKED (max 5/run) → render generateCover()
 * (resvg-js + sharp) → save WebP cover/thumb to .output/public/blog-covers/
 * → UPDATE queue.status = 'done' with public URLs.
 *
 * No AUDIT_MODE: operational consumer (not an audit-only process). Cutover =
 * disable `ac_covergen --process-queue` Python the same day as
 * Nitro cron activation.
 */

import { defineTask } from 'nitropack/runtime'
import { skipIfNotAcInternal } from '~/server/utils/cron-context'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'
import { processCoverQueue } from '~/server/utils/covergen-queue'

const PG_SCHEMA = 'cs_main'
const AUTOMATE_KEY = 'ac_covergen_queue'
const BATCH_LIMIT = 5

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
    name: 'cover:queue-process',
    description: 'Consumer cs_covergen_queue (port ac_covergen --process-queue, Wave 3 #3 Phase D)',
  },
  async run() {
    const skip = skipIfNotAcInternal('cover:queue-process')
    if (skip) return skip
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock(AUTOMATE_KEY, async () => {
      return runAutomate(AUTOMATE_KEY, async (log) => {
        const outcome = await processCoverQueue({ limit: BATCH_LIMIT })
        log.count('scanned', outcome.scanned)
        log.count('processed', outcome.processed)
        log.count('errors', outcome.errors)

        const summary =
          outcome.scanned === 0
            ? 'queue empty'
            : `${outcome.processed}/${outcome.scanned} ok, ${outcome.errors} err`
        const status = outcome.errors > 0 ? 'partial' : 'ok'
        log.setResult(status, summary)

        return {
          status,
          scanned: outcome.scanned,
          processed: outcome.processed,
          errors: outcome.errors,
          items: outcome.items,
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
