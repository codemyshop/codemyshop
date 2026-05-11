

import { queueAiGeneration } from '~/modules/product-extra/server/utils/productextra'

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  if (!body) throw createError({ statusCode: 400, message: 'Body manquant' })

  const result = await queueAiGeneration(
    {
      product_name: String(body.product_name ?? ''),
      context: body.context ? String(body.context) : null,
      id_product: Number(body.id_product) || 0,
    },
    { event },
  )
  if (!result.ok) {
    throw createError({ statusCode: 400, message: result.error })
  }
  return { success: true, id_queue: result.id_queue }
})
