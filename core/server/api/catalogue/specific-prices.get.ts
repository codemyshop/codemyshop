/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/catalogue/specific-prices?clientId=...
 *
 * List of active product discounts. Direct DB (doctrine "Zero web service"
 * PrestaShop » 2026-04-22). Refacto depuis connector.getSpecificPrices.
 */
import { useClientDb, useClientDbById } from '~/server/utils/db'

interface SpRow {
  id_product: number
  reduction: string
  reduction_type: string
  from_quantity: number
}

export default defineEventHandler(async (event) => {
  const { clientId } = getQuery(event) as { clientId?: string }
  const db = clientId ? useClientDbById(clientId) : useClientDb(event)
  try {
    const rows = await db.query<SpRow>(
      `SELECT id_product, reduction, reduction_type, from_quantity
         FROM ps_specific_price
        WHERE (date_from IS NULL OR date_from <= NOW())
          AND (date_to   IS NULL OR date_to   >= NOW())
        ORDER BY id_product`,
    )
    return rows.map((r) => ({
      productId: Number(r.id_product),
      reduction: Number(r.reduction),
      reductionType: (r.reduction_type === 'amount' ? 'amount' : 'percentage') as 'amount' | 'percentage',
      fromQuantity: Number(r.from_quantity || 1),
    }))
  } catch (err: any) {
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) return []
    console.error('[specific-prices] DB error:', err?.message)
    return []
  }
})
