/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { createLot } from '~/enterprise/vertical-food/lot/server/utils/lot'

/**
 * POST /api/bo/lots — creates a traceability batch upon supplier receipt.
 * The received quantity initializes quantity_remaining (FIFO starts from there).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    lotNumber: string
    idProduct: number
    idProductAttribute?: number
    idSupplier?: number
    entryDate: string
    expiryDate?: string | null
    qtyReceived: number
    origin?: string | null
    caliber?: string | null
    notes?: string | null
  }>(event)

  if (!body?.lotNumber || !body.idProduct || !body.entryDate || body.qtyReceived == null) {
    throw createError({ statusCode: 400, statusMessage: 'lotNumber, idProduct, entryDate, qtyReceived requis' })
  }

  await createLot(
    {
      lotNumber: body.lotNumber,
      idProduct: body.idProduct,
      idProductAttribute: body.idProductAttribute || 0,
      idSupplier: body.idSupplier || 0,
      entryDate: body.entryDate,
      expiryDate: body.expiryDate || null,
      qtyReceived: body.qtyReceived,
      origin: body.origin || null,
      caliber: body.caliber || null,
      notes: body.notes || null,
    },
    { event },
  )
  return { ok: true }
})
