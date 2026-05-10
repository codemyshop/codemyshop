/**
 *
 * Nitro Task — cover:carousel-process
 *
 * Wave 4B of task #43. Consumer of cs_carousel_queue which replaces
 * `synedre/ac_carouselgen.py` (never activated in Python cron: the queue
 * was populated by /api/bo/marketing/blog/generate-carousel but no
 * consumer was running — direct port to Nitro avoids the Python cron).
 *
 * Pattern miroir cover:queue-process (defineTask + pgSchemaExists +
 * withAutomateLock + runAutomate). No AUDIT_MODE (operational consumer).
 *
 * Cron: 15 * * * * (every hour, sufficient for LinkedIn carousels).
 */

import { defineTask } from 'nitropack/runtime'
import { skipIfNotAcInternal } from '~/server/utils/cron-context'
import { withAutomateLock } from '~/server/utils/automate-lock'
import { runAutomate } from '~/server/utils/automate-logger'
import { getPgClient } from '~/server/utils/db-pg-adapter'
import { processCarouselQueue } from '~/server/utils/carousel-queue'

const PG_SCHEMA = 'cs_main'
const AUTOMATE_KEY = 'ac_carouselgen'
const BATCH_LIMIT = 3

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
    name: 'cover:carousel-process',
    description: 'Consumer cs_carousel_queue (port ac_carouselgen, Wave 4B)',
  },
  async run() {
    const skip = skipIfNotAcInternal('cover:carousel-process')
    if (skip) return skip
    if (!(await pgSchemaExists(PG_SCHEMA))) {
      return { result: { status: 'skipped', reason: `schema-absent:${PG_SCHEMA}` } }
    }

    const lockResult = await withAutomateLock(AUTOMATE_KEY, async () => {
      return runAutomate(AUTOMATE_KEY, async (log) => {
        const outcome = await processCarouselQueue({ limit: BATCH_LIMIT })
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
