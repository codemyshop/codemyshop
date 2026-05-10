/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { getLotById, listRecallCustomers } from '~/enterprise/vertical-food/lot/server/utils/lot'

/**
 * GET /api/bo/lots/:id/recall — customers to notify in case of recall.
 *
 * Priority 1: exact link cs_lot_order_detail (populated by the hook
 *              actionValidateOrder depuis ac_lot 1.1.0).
 * Fallback: if no line (batch pre-1.1.0 or outside FIFO scope),
 * approximation by product + entry/expiry window.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  const lotInfo = await getLotById(id, { event })
  if (!lotInfo) throw createError({ statusCode: 404, statusMessage: 'Lot introuvable' })

  const { method, customers } = await listRecallCustomers(lotInfo, { event })

  return {
    ok: true,
    method,
    lot: {
      id: lotInfo.idLot,
      lotNumber: lotInfo.lotNumber,
      idProduct: lotInfo.idProduct,
      entryDate: lotInfo.entryDate,
      expiryDate: lotInfo.expiryDate,
    },
    customers,
    total: customers.length,
  }
})
