

import { upsertTier } from '~/enterprise/misc/pricing/server/utils/pricing'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    idGroup: number
    idProduct: number
    idProductAttribute?: number
    minQuantity: number
    unitPriceHt: number
    currency?: string
    active?: number
  }>(event)

  if (!body?.idGroup || !body?.idProduct || body.unitPriceHt == null) {
    throw createError({ statusCode: 400, statusMessage: 'idGroup, idProduct, unitPriceHt requis' })
  }
  if (body.minQuantity <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'minQuantity doit être > 0' })
  }
  if (body.unitPriceHt < 0) {
    throw createError({ statusCode: 400, statusMessage: 'unitPriceHt doit être ≥ 0' })
  }

  await upsertTier(
    {
      idGroup: body.idGroup,
      idProduct: body.idProduct,
      idProductAttribute: body.idProductAttribute ?? 0,
      minQuantity: body.minQuantity,
      unitPriceHt: body.unitPriceHt,
      currency: body.currency ?? 'EUR',
      active: body.active ?? 1,
    },
    { event },
  )
  return { ok: true }
})
