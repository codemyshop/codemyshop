

import { requireCustomer } from '~/server/utils/customer-session'
import { assertOwnership, itemsForList } from '~/server/utils/wishlist-db'

export default defineEventHandler(async (event) => {
  const session = requireCustomer(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'id invalide' })
  }
  const query = getQuery(event)
  const idLang = Math.max(1, Number(query?.id_lang || 1))

  if (!(await assertOwnership(id, session.customerId, { event }))) {
    throw createError({ statusCode: 403, message: 'Liste introuvable ou non autorisée' })
  }

  const items = await itemsForList(id, idLang, { event })
  return {
    success: true,
    id_wishlist: id,
    items: items.map((i) => ({
      id_wishlist_product: i.idWishlistProduct,
      id_product: i.idProduct,
      id_product_attribute: i.idProductAttribute,
      quantity: i.quantity,
      priority: i.priority,
      product_name: i.productName,
      link_rewrite: i.linkRewrite,
      base_price: i.basePrice,
      reference: i.reference,
      active: i.active,
      id_image: i.idImage,
    })),
    total: items.length,
  }
})
