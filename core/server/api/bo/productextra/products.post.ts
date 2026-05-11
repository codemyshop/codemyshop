

import { saveProduct } from '~/modules/product-extra/server/utils/productextra'

export default defineEventHandler(async (event) => {
  const body = await readBody<any>(event)
  if (!body) throw createError({ statusCode: 400, message: 'Body manquant' })

  const result = await saveProduct(body, { event })
  if (!result.ok) {
    return { success: false, error: result.error }
  }
  return {
    success: true,
    id_product: result.id_product,
    message: result.created ? 'Produit créé avec succès' : 'Produit mis à jour',
  }
})
