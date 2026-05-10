/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { recordWeigh } from '~/enterprise/vertical-food/catchweight/server/utils/catchweight'

/**
 * POST /api/bo/catch-weight/weigh — Records the actual weight of an order line.
 *
 * Body : { idLineWeight, weightShippedKg, idEmployee?, notes? }
 *
 * Recalcule price_final_ht = weight_shipped_kg × price_per_kg_ht.
 * Idempotent: re-entry updates without creating an additional line
 * (avoids double-billing mentioned in acceptance tests).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    idLineWeight: number
    weightShippedKg: number
    idEmployee?: number
    notes?: string
  }>(event)

  if (!body?.idLineWeight) {
    throw createError({ statusCode: 400, statusMessage: 'idLineWeight requis' })
  }
  if (!(body.weightShippedKg >= 0)) {
    throw createError({ statusCode: 400, statusMessage: 'weightShippedKg doit être ≥ 0' })
  }

  try {
    const result = await recordWeigh(
      {
        idLineWeight: body.idLineWeight,
        weightShippedKg: body.weightShippedKg,
        idEmployee: body.idEmployee ?? null,
        notes: body.notes ?? null,
      },
      { event },
    )
    return { ok: true, priceFinalHt: result.priceFinalHt }
  } catch (e: any) {
    if (e?.statusCode === 404) {
      throw createError({ statusCode: 404, statusMessage: 'ligne introuvable' })
    }
    throw e
  }
})
