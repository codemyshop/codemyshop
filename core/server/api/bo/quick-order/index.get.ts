/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listQuickOrderLists } from '~/modules/quickorder/server/utils/quickorder'

/**
 * GET /api/bo/quick-order — Overview of persisted lists.
 *
 * Returns all lists (all customers) with line item count,
 * customer name and default indicator. Sorted DESC by date_upd.
 */
export default defineEventHandler(async (event) => {
  const lists = await listQuickOrderLists({ event })
  return { ok: true, lists }
})
