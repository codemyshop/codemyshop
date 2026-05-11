

import { listLegalLabelsAll } from '~/enterprise/vertical-food/product-food/server/utils/product-food'

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
