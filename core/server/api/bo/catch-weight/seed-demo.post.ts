/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { seedDemoLine } from '~/enterprise/vertical-food/catchweight/server/utils/catchweight'

/**
 * POST /api/bo/catch-weight/seed-demo — Generates a fictional weighed line for the demo.
 *
 * Body : { idProduct, quantityOrdered, weightOrderedKg, pricePerKgHt }
 * Creates a line pending weighing without a real id_order (id_order=0, for demo purposes).
 * To remove in production — useful for validating the UI without going through an order.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    idProduct: number
    quantityOrdered: number
    weightOrderedKg: number
    pricePerKgHt: number
  }>(event)

  if (!body?.idProduct || !body?.weightOrderedKg || !body?.pricePerKgHt) {
    throw createError({ statusCode: 400, statusMessage: 'idProduct, weightOrderedKg, pricePerKgHt requis' })
  }

  const result = await seedDemoLine(
    {
      idProduct: body.idProduct,
      quantityOrdered: body.quantityOrdered || 1,
      weightOrderedKg: body.weightOrderedKg,
      pricePerKgHt: body.pricePerKgHt,
    },
    { event },
  )

  return { ok: true, priceOrderedHt: result.priceOrderedHt }
})
