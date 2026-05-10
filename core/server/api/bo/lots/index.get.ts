/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listLots, getLotsStats, type ExpiryWindow } from '~/enterprise/vertical-food/lot/server/utils/lot'

/**
 * GET /api/bo/lots — lists traceability batches with product, supplier,
 * days before expiration calculated on the SQL side to avoid JS recomputes.
 *
 * Query : ?search=…&expiryWindow=7|30|all&limit=100
 *
 * - search : lot_number / product name / supplier name
 * - expiryWindow: 7 = expires in 7d, 30 = in 30d, all = all (default)
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const [lots, stats] = await Promise.all([
    listLots(
      {
        search: q.search,
        expiryWindow: (q.expiryWindow as ExpiryWindow) || 'all',
        limit: Number(q.limit || 100),
      },
      { event },
    ),
    getLotsStats({ event }),
  ])
  return { ok: true, lots, stats }
})
