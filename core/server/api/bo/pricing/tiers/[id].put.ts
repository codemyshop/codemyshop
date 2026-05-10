/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { updateTier } from '~/enterprise/misc/pricing/server/utils/pricing'

/** PUT /api/bo/pricing/tiers/:id — updates a tier. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  const body = await readBody<{
    minQuantity?: number
    unitPriceHt?: number
    currency?: string
    active?: number
  }>(event)

  if (body.minQuantity != null && body.minQuantity <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'minQuantity doit être > 0' })
  }
  if (body.unitPriceHt != null && body.unitPriceHt < 0) {
    throw createError({ statusCode: 400, statusMessage: 'unitPriceHt doit être ≥ 0' })
  }

  await updateTier(id, body, { event })
  return { ok: true }
})
