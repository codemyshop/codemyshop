/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listTours } from '~/modules/routing/server/utils/routing'

/** GET /api/bo/routing/tours — lists tours (filtered by optional date). */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const date = String(q.date || '').trim() || null
  const tours = await listTours(date, { event })
  return { ok: true, tours }
})
