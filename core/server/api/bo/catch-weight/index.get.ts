/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import {
  listCatchWeightProducts,
  listPendingWeighs,
  listWeighedLines,
} from '~/enterprise/vertical-food/catchweight/server/utils/catchweight'

/**
 * GET /api/bo/catch-weight — WMS preparation view.
 *
 * Retourne :
 * - products: all products flagged with variable weight
 * - pending: order lines awaiting weighing (weight_shipped_kg IS NULL)
 * - weighed: 50 most recent weighings with billing delta
 */
export default defineEventHandler(async (event) => {
  const [products, pending, weighed] = await Promise.all([
    listCatchWeightProducts({ event }),
    listPendingWeighs({ event }),
    listWeighedLines(50, { event }),
  ])
  return { ok: true, products, pending, weighed }
})
