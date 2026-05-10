/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/procurement/purchase-orders — liste bons de commande fournisseur (ps_supply_order).
 * Query: ?state=<id>, ?supplier=<id> (optional for filtering)
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const stateId = q.state ? Number(q.state) : null
  const supplierId = q.supplier ? Number(q.supplier) : null

  const db = useClientDb(event)

  const where: string[] = ['po.is_template = 0']
  const params: any[] = []
  if (stateId) { where.push('po.id_supply_order_state = ?'); params.push(stateId) }
  if (supplierId) { where.push('po.id_supplier = ?'); params.push(supplierId) }
  const whereSql = `WHERE ${where.join(' AND ')}`

  try {
    const orders = await db.query<any>(`
      SELECT
        po.id_supply_order                                AS id,
        po.reference,
        po.id_supplier                                    AS idSupplier,
        po.supplier_name                                  AS supplierName,
        po.date_add                                       AS dateAdd,
        po.date_delivery_expected                         AS deliveryDate,
        ROUND(po.total_ti, 2)                             AS totalTTC,
        ROUND(po.total_te, 2)                             AS totalHT,
        po.id_supply_order_state                          AS stateId,
        COALESCE(sl.name, 'État inconnu')                 AS stateName,
        st.color                                          AS stateColor,
        st.editable,
        st.enclosed,
        (SELECT COUNT(*) FROM ps_supply_order_detail d WHERE d.id_supply_order = po.id_supply_order) AS lineCount
      FROM ps_supply_order po
      LEFT JOIN ps_supply_order_state st
        ON st.id_supply_order_state = po.id_supply_order_state
      LEFT JOIN ps_supply_order_state_lang sl
        ON sl.id_supply_order_state = po.id_supply_order_state AND sl.id_lang = 1
      ${whereSql}
      ORDER BY po.date_add DESC
      LIMIT 200
    `, params)

    const states = await db.query<any>(`
      SELECT s.id_supply_order_state AS id, sl.name, s.color
      FROM ps_supply_order_state s
      LEFT JOIN ps_supply_order_state_lang sl ON sl.id_supply_order_state = s.id_supply_order_state AND sl.id_lang = 1
      ORDER BY s.id_supply_order_state ASC
    `)

    return {
      total:  orders.length,
      totalValue: orders.reduce((s: number, o: any) => s + Number(o.totalTTC || 0), 0),
      orders: orders.map((o: any) => ({
        id: o.id, reference: o.reference,
        idSupplier: o.idSupplier, supplierName: o.supplierName,
        dateAdd: o.dateAdd, deliveryDate: o.deliveryDate,
        totalTTC: Number(o.totalTTC || 0), totalHT: Number(o.totalHT || 0),
        stateId: o.stateId, stateName: o.stateName, stateColor: o.stateColor || '#666',
        editable: Number(o.editable) === 1, enclosed: Number(o.enclosed) === 1,
        lineCount: Number(o.lineCount || 0),
      })),
      states: states.map((s: any) => ({ id: s.id, name: s.name || `État ${s.id}`, color: s.color || '#666' })),
    }
  } catch (err: any) {
    console.error('[bo/procurement/purchase-orders GET] DB error:', err?.message)
    return { total: 0, totalValue: 0, orders: [], states: [] }
  }
})
