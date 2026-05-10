/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { upsertProductCatchWeight, type PriceUnit } from '~/enterprise/vertical-food/catchweight/server/utils/catchweight'

/**
 * POST /api/bo/catch-weight/flag — Activates/updates the variable weight flag.
 *
 * Body : { idProduct, isActive?, nominalWeightKg, priceUnit?, tolerancePct? }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    idProduct: number
    isActive?: number
    nominalWeightKg: number
    priceUnit?: PriceUnit
    tolerancePct?: number
  }>(event)

  if (!body?.idProduct) throw createError({ statusCode: 400, statusMessage: 'idProduct requis' })
  if (!(body.nominalWeightKg > 0)) {
    throw createError({ statusCode: 400, statusMessage: 'nominalWeightKg doit être > 0' })
  }
  const unit = (body.priceUnit || 'kg') as PriceUnit
  if (!['kg', 'piece', 'lot'].includes(unit)) {
    throw createError({ statusCode: 400, statusMessage: 'priceUnit ∈ kg|piece|lot' })
  }

  await upsertProductCatchWeight(
    {
      idProduct: body.idProduct,
      isActive: body.isActive ?? 1,
      nominalWeightKg: body.nominalWeightKg,
      priceUnit: unit,
      tolerancePct: body.tolerancePct ?? 5,
    },
    { event },
  )
  return { ok: true }
})
