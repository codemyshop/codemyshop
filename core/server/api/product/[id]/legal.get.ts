

import { getLegalForProduct } from '~/enterprise/vertical-food/product-food/server/utils/product-food'

export default defineEventHandler(async (event) => {
  const idProduct = Number(getRouterParam(event, 'id'))
  const idLang = Number(getQuery(event).lang ?? 1)
  if (!idProduct) throw createError({ statusCode: 400, statusMessage: 'id invalide', data: { code: 'INVALID_PRODUCT_ID' } })

  const { legal, lot } = await getLegalForProduct(idProduct, idLang, { event })

  const origin = legal?.originIso2 || lot?.origin || null
  const caliber = legal?.caliber || lot?.caliber || null

  const sources = {
    origin: legal?.originIso2 ? 'product' : (lot?.origin ? 'lot' : 'none'),
    caliber: legal?.caliber ? 'product' : (lot?.caliber ? 'lot' : 'none'),
    category: legal?.categoryLegal ? 'product' : 'none',
    mentions: legal?.additionalMentions ? 'product' : 'none',
  }

  return {
    ok: true,
    idProduct,
    idLang,
    origin,
    caliber,
    category: legal?.categoryLegal || null,
    mentions: legal?.additionalMentions || null,
    sources,
  }
})
