/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { resolveCustomerPrice } from '~/enterprise/misc/pricing/server/utils/pricing'

/**
 * POST /api/bo/quick-order/bulk — Resolve cart from (SKU, qty) pairs.
 *
 * Body : { items: [{sku: string, qty: number}], idCustomer?: number }
 *
 * For each item:
 *   1. Match par ps_product.reference (SKU exact)
 *   2. Fallback : match par ps_product_attribute.reference
 *   3. Sinon : status='not_found'
 * If idCustomer provided, price resolved via the pricing facade
 * (priority: contract > tier > catalog).
 * Checks stock ps_stock_available.quantity.
 *
 * Returns { resolved, notFound, totals } in < 3s for 50 items.
 *
 * Stays on the raw mysql2 pool for native PS catalog lookups
 * (ps_product / ps_product_attribute / ps_stock_available) — these tables
 * are not owned by an ac_* module, no dedicated facade to create.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    items: { sku: string; qty: number }[]
    idCustomer?: number
  }>(event)

  if (!Array.isArray(body?.items) || body.items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'items requis (tableau non vide)' })
  }
  if (body.items.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'max 500 items par appel' })
  }

  const db = useClientDb(event)
  const idCustomer = Number(body.idCustomer || 0)

  const resolved: any[] = []
  const notFound: any[] = []
  let totalHt = 0
  let totalQuantity = 0

  for (const item of body.items) {
    const sku = String(item.sku || '').trim()
    const qty = Number(item.qty || 0)
    if (!sku || qty <= 0) {
      notFound.push({ sku, qty, reason: 'input_invalid' })
      continue
    }

    const products = await db.query<any>(`
      SELECT
        p.id_product       AS idProduct,
        0                  AS idProductAttribute,
        p.reference        AS reference,
        pl.name            AS productName,
        p.price            AS basePrice,
        sa.quantity        AS stock
      FROM ps_product p
      LEFT JOIN ps_product_lang    pl ON pl.id_product = p.id_product AND pl.id_lang = 1
      LEFT JOIN ps_stock_available sa ON sa.id_product = p.id_product AND sa.id_product_attribute = 0
      WHERE p.reference = ? AND p.active = 1
      LIMIT 1
    `, [sku])

    let product = products?.[0]

    if (!product) {
      const combinations = await db.query<any>(`
        SELECT
          pa.id_product           AS idProduct,
          pa.id_product_attribute AS idProductAttribute,
          pa.reference            AS reference,
          pl.name                 AS productName,
          (p.price + pa.price)    AS basePrice,
          sa.quantity             AS stock
        FROM ps_product_attribute pa
        INNER JOIN ps_product      p  ON p.id_product = pa.id_product
        LEFT JOIN ps_product_lang  pl ON pl.id_product = pa.id_product AND pl.id_lang = 1
        LEFT JOIN ps_stock_available sa
               ON sa.id_product = pa.id_product
              AND sa.id_product_attribute = pa.id_product_attribute
        WHERE pa.reference = ? AND p.active = 1
        LIMIT 1
      `, [sku])
      product = combinations?.[0]
    }

    if (!product) {
      notFound.push({ sku, qty, reason: 'not_in_catalog' })
      continue
    }

    const basePrice = Number(product.basePrice || 0)
    const { unitPriceHt, source, label } = await resolveCustomerPrice(
      idCustomer,
      Number(product.idProduct),
      qty,
      basePrice,
      { event },
    )

    const stock = Number(product.stock ?? 0)
    const lineTotal = unitPriceHt * qty
    const status = stock >= qty ? 'ok' : (stock > 0 ? 'partial' : 'out_of_stock')

    resolved.push({
      sku,
      qty,
      idProduct: product.idProduct,
      idProductAttribute: product.idProductAttribute,
      productName: product.productName,
      reference: product.reference,
      unitPriceHt,
      priceSource: source,
      priceLabel: label,
      stock,
      status,
      lineTotalHt: lineTotal,
    })
    totalHt += lineTotal
    totalQuantity += qty
  }

  return {
    ok: true,
    resolved,
    notFound,
    totals: {
      totalHt,
      totalQuantity,
      nbResolved: resolved.length,
      nbNotFound: notFound.length,
    },
  }
})
