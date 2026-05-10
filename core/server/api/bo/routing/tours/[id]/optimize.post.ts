/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { optimizeTour } from '~/modules/routing/server/utils/routing'

/**
 * POST /api/bo/routing/tours/:id/optimize
 * Orders stops by Nearest Neighbor from the depot (lat/lng).
 * Stops without coordinates (lat=0 AND lng=0) are placed at the end in their original order.
 * Updates positions + total_km (haversine distance) + optimized_at.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  const result = await optimizeTour(id, { event })
  if (!result) throw createError({ statusCode: 404, statusMessage: 'Tournée introuvable' })

  return { ok: true, ...result }
})
