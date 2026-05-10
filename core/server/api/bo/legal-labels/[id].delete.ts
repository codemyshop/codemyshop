/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { deleteFoodForProduct } from '~/enterprise/vertical-food/product-food/server/utils/product-food'

/** DELETE /api/bo/legal-labels/:id — :id = id_product. Cascades on _lang via FK. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  await deleteFoodForProduct(id, { event })
  return { ok: true }
})
