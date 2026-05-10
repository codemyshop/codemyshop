/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listLegalLabelsAll } from '~/enterprise/vertical-food/product-food/server/utils/product-food'

/**
 * GET /api/bo/legal-labels — Complete list of legal notices + inheritance preview.
 *
 * Returns for each product × language:
 * - cs_product_food fields + _lang (if present)
 * - inherited: { origin, caliber } from the active FIFO batch (cs_lot)
 * - effective: resolved final value (product > inherited > null)
 */
export default defineEventHandler(async (event) => {
  const rows = await listLegalLabelsAll(1, { event })

  const enriched = rows.map((r) => {
    const effectiveOrigin = r.originIso2 || r.inheritedOrigin || null
    const effectiveCaliber = r.caliber || r.inheritedCaliber || null
    return {
      ...r,
      effectiveOrigin,
      effectiveCaliber,
      hasLegal: r.id != null,
      hasInheritance: (!r.originIso2 && !!r.inheritedOrigin) || (!r.caliber && !!r.inheritedCaliber),
    }
  })

  return { ok: true, products: enriched }
})
