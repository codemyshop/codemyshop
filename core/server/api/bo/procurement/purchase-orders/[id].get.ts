/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/procurement/purchase-orders/:id — purchase order detail.
 * Returns the header, detailed lines, and state transition history.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  const db = useClientDb(event)

  try {
    const order = await db.get<any>(`
      SELECT
        po.id_supply_order AS id,
        po.reference,
        po.id_supplier AS idSupplier,
        po.supplier_name AS supplierName,
        po.id_warehouse AS idWarehouse,
        po.id_supply_order_state AS stateId,
        po.date_add AS dateAdd,
        po.date_upd AS dateUpd,
        po.date_delivery_expected AS deliveryDate,
        ROUND(po.total_te, 2) AS totalHT,
        ROUND(po.total_tax, 2) AS totalTax,
        ROUND(po.total_ti, 2) AS totalTTC,
        COALESCE(sl.name, 'État inconnu') AS stateName,
        st.color AS stateColor,
        st.editable, st.enclosed, st.receipt_state AS receiptState, st.pending_receipt AS pendingReceipt,
        w.name AS warehouseName
      FROM ps_supply_order po
      LEFT JOIN ps_supply_order_state st ON st.id_supply_order_state = po.id_supply_order_state
      LEFT JOIN ps_supply_order_state_lang sl ON sl.id_supply_order_state = po.id_supply_order_state AND sl.id_lang = 1
      LEFT JOIN ps_warehouse w ON w.id_warehouse = po.id_warehouse
      WHERE po.id_supply_order = ?
      LIMIT 1
    `, [id])

    if (!order) throw createError({ statusCode: 404, statusMessage: 'BC introuvable' })

    const lines = await db.query<any>(`
      SELECT
        id_supply_order_detail AS id,
        id_product AS idProduct,
        reference, supplier_reference AS supplierRef, name,
        ROUND(unit_price_te, 2) AS unitPriceTE,
        quantity_expected AS quantityExpected,
        quantity_received AS quantityReceived,
        ROUND(price_te, 2) AS priceTE,
        ROUND(tax_rate, 2) AS taxRate,
        ROUND(tax_value, 2) AS taxValue,
        ROUND(price_ti, 2) AS priceTI
      FROM ps_supply_order_detail
      WHERE id_supply_order = ?
      ORDER BY id_supply_order_detail ASC
    `, [id])

    const history = await db.query<any>(`
      SELECT
        h.id_supply_order_history AS id,
        h.date_add AS dateAdd,
        h.employee_firstname AS employeeFirstname,
        h.employee_lastname AS employeeLastname,
        h.id_state AS stateId,
        COALESCE(sl.name, 'État inconnu') AS stateName,
        st.color AS stateColor
      FROM ps_supply_order_history h
      LEFT JOIN ps_supply_order_state st ON st.id_supply_order_state = h.id_state
      LEFT JOIN ps_supply_order_state_lang sl ON sl.id_supply_order_state = h.id_state AND sl.id_lang = 1
      WHERE h.id_supply_order = ?
      ORDER BY h.date_add ASC
    `, [id])

    const allStates = await db.query<any>(`
      SELECT s.id_supply_order_state AS id, sl.name, s.color,
             s.editable, s.enclosed, s.receipt_state AS receiptState, s.pending_receipt AS pendingReceipt
      FROM ps_supply_order_state s
      LEFT JOIN ps_supply_order_state_lang sl ON sl.id_supply_order_state = s.id_supply_order_state AND sl.id_lang = 1
      ORDER BY s.id_supply_order_state ASC
    `)

    return {
      order: {
        id: order.id, reference: order.reference,
        idSupplier: order.idSupplier, supplierName: order.supplierName,
        idWarehouse: order.idWarehouse, warehouseName: order.warehouseName || '—',
        stateId: order.stateId, stateName: order.stateName, stateColor: order.stateColor || '#666',
        editable: Number(order.editable) === 1,
        enclosed: Number(order.enclosed) === 1,
        receiptState: Number(order.receiptState) === 1,
        pendingReceipt: Number(order.pendingReceipt) === 1,
        dateAdd: order.dateAdd, dateUpd: order.dateUpd, deliveryDate: order.deliveryDate,
        totalHT: Number(order.totalHT || 0),
        totalTax: Number(order.totalTax || 0),
        totalTTC: Number(order.totalTTC || 0),
      },
      lines: lines.map((l: any) => ({
        id: l.id, idProduct: l.idProduct,
        reference: l.reference, supplierRef: l.supplierRef, name: l.name,
        unitPriceTE: Number(l.unitPriceTE || 0),
        quantityExpected: Number(l.quantityExpected || 0),
        quantityReceived: Number(l.quantityReceived || 0),
        priceTE: Number(l.priceTE || 0),
        taxRate: Number(l.taxRate || 0),
        taxValue: Number(l.taxValue || 0),
        priceTI: Number(l.priceTI || 0),
      })),
      history: history.map((h: any) => ({
        id: h.id, dateAdd: h.dateAdd,
        employee: [h.employeeFirstname, h.employeeLastname].filter(Boolean).join(' '),
        stateId: h.stateId, stateName: h.stateName, stateColor: h.stateColor || '#666',
      })),
      states: allStates.map((s: any) => ({
        id: s.id, name: s.name || `État ${s.id}`, color: s.color || '#666',
        editable: Number(s.editable) === 1,
        enclosed: Number(s.enclosed) === 1,
        receiptState: Number(s.receiptState) === 1,
        pendingReceipt: Number(s.pendingReceipt) === 1,
      })),
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[bo/procurement/purchase-orders/:id GET] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'Erreur DB' })
  }
})
