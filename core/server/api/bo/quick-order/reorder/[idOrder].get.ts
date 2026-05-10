/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { cloneOrderItems } from '~/modules/quickorder/server/utils/quickorder'

/**
 * GET /api/bo/quick-order/reorder/:idOrder — Clone commande existante → items SKU/qty.
 *
 * Retourne { items: [{sku, qty}], order: {id, date, id_customer, customer_name} }
 * ready to be passed to /bulk for cart construction.
 */
export default defineEventHandler(async (event) => {
  const idOrder = Number(getRouterParam(event, 'idOrder'))
  if (!idOrder) throw createError({ statusCode: 400, statusMessage: 'idOrder invalide' })

  const result = await cloneOrderItems(idOrder, { event })
  if (!result) throw createError({ statusCode: 404, statusMessage: 'commande introuvable' })

  return { ok: true, order: result.order, items: result.items }
})
