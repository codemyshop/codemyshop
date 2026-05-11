

import { seedDemoLine } from '~/enterprise/vertical-food/catchweight/server/utils/catchweight'

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
