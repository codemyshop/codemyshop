/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { experimentStats, listExperiments } from '~/enterprise/misc/ab-testing/server/utils/ab-testing'

/** GET /api/bo/products/ab-testing — list of A/B experiments. */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const status = (q.status || '').trim() || undefined

  try {
    const [experiments, stats] = await Promise.all([
      listExperiments(status, { event }),
      experimentStats({ event }),
    ])
    return { ...stats, experiments }
  } catch (err: any) {
    console.error('[bo/products/ab-testing GET] DB error:', err?.message)
    return { total: 0, running: 0, draft: 0, ended: 0, experiments: [] }
  }
})
