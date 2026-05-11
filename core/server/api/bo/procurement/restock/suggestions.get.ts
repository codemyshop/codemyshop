

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const thresholdDays = Math.max(1, Math.min(60, Number(q.threshold || 15)))
  const targetCoverDays = Math.max(7, Math.min(180, Number(q.targetCover || 60)))

  const db = useClientDb(event)

  try {
    const rows = await db.query<any>(`
      SELECT
        p.id_product                                     AS id,
        pl.name,
        p.reference,
        COALESCE(sa.quantity, 0)                         AS stock,
        ps.id_supplier                                   AS idSupplier,
        sup.name                                         AS supplierName,
        COALESCE(ps.product_supplier_price_te, p.wholesale_price, 0) AS unitPriceTE,
        COALESCE(ps.product_supplier_reference, '')      AS supplierRef,
        (SELECT COALESCE(SUM(od.product_quantity), 0)
         FROM ps_order_detail od
         JOIN ps_orders o ON o.id_order = od.id_order
         WHERE od.product_id = p.id_product
           AND o.valid = 1
           AND o.date_add >= DATE_SUB(NOW(), INTERVAL 30 DAY))   AS sold30
      FROM ps_product p
      JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = 1
      LEFT JOIN ps_stock_available sa
        ON sa.id_product = p.id_product AND sa.id_product_attribute = 0
      LEFT JOIN ps_product_supplier ps
        ON ps.id_product = p.id_product AND ps.id_product_attribute = 0
       AND (ps.id_supplier = p.id_supplier OR p.id_supplier = 0)
      LEFT JOIN ps_supplier sup
        ON sup.id_supplier = ps.id_supplier
      WHERE p.active = 1
      HAVING sold30 > 0
      ORDER BY sold30 DESC
      LIMIT 500
    `)

    const eligible = rows.filter((r: any) => {
      const velocity = Number(r.sold30) / 30
      const stock = Number(r.stock || 0)
      const daysLeft = velocity > 0 ? stock / velocity : Infinity
      return stock === 0 || daysLeft <= thresholdDays
    }).map((r: any) => {
      const velocity = Number(r.sold30) / 30
      const stock = Number(r.stock || 0)
      const daysLeft = velocity > 0 ? Math.floor(stock / velocity) : 0
      const suggested = Math.max(1, Math.ceil((targetCoverDays * velocity) - stock))
      const unitPrice = Number(r.unitPriceTE || 0)
      return {
        id: Number(r.id),
        name: r.name,
        reference: r.reference || '',
        idSupplier: r.idSupplier ? Number(r.idSupplier) : null,
        supplierName: r.supplierName || null,
        supplierRef: r.supplierRef || '',
        stock,
        sold30: Number(r.sold30 || 0),
        velocity: Math.round(velocity * 100) / 100,
        daysLeft,
        suggestedQty: suggested,
        unitPriceTE: unitPrice,
        lineTotal: Math.round(suggested * unitPrice * 100) / 100,
      }
    })

    
    const groups: Record<string, any> = {}
    for (const p of eligible) {
      const key = p.idSupplier ? String(p.idSupplier) : 'none'
      if (!groups[key]) {
        groups[key] = {
          idSupplier: p.idSupplier,
          supplierName: p.supplierName || 'Non assigné',
          items: [],
          totalTE: 0,
          totalQty: 0,
        }
      }
      groups[key].items.push(p)
      groups[key].totalTE += p.lineTotal
      groups[key].totalQty += p.suggestedQty
    }

    const suppliers = Object.values(groups).map((g: any) => ({
      ...g,
      totalTE: Math.round(g.totalTE * 100) / 100,
    })).sort((a: any, b: any) => b.totalTE - a.totalTE)

    return {
      thresholdDays, targetCoverDays,
      totalProducts: eligible.length,
      totalValue: Math.round(suppliers.reduce((s: number, g: any) => s + g.totalTE, 0) * 100) / 100,
      suppliers,
    }
  } catch (err: any) {
    console.error('[bo/procurement/restock/suggestions GET] DB error:', err?.message)
    return { thresholdDays, targetCoverDays, totalProducts: 0, totalValue: 0, suppliers: [] }
  }
})
