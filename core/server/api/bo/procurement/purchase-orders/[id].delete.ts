/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * DELETE /api/bo/procurement/purchase-orders/:id — cancellation of a purchase order.
 *
 * - If state = "In creation" (1, editable): hard deletion (purchase order + lines + history).
 * - Otherwise: transition to state 6 "Order cancelled".
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  const db = useClientDb(event)

  try {
    const order = await db.get<any>(`
      SELECT po.id_supply_order, po.id_supply_order_state, st.editable
      FROM ps_supply_order po
      LEFT JOIN ps_supply_order_state st ON st.id_supply_order_state = po.id_supply_order_state
      WHERE po.id_supply_order = ? LIMIT 1
    `, [id])
    if (!order) throw createError({ statusCode: 404, statusMessage: 'BC introuvable' })

    if (Number(order.editable) === 1) {
      // Hard delete si l'état est éditable (brouillon)
      await db.run(`DELETE FROM ps_supply_order_detail WHERE id_supply_order = ?`, [id])
      await db.run(`DELETE FROM ps_supply_order_history WHERE id_supply_order = ?`, [id])
      await db.run(`DELETE FROM ps_supply_order WHERE id_supply_order = ?`, [id])
      return { ok: true, id, hardDelete: true }
    }

    // Soft cancel : transition vers état 6 (Annulé)
    await db.run(`UPDATE ps_supply_order SET id_supply_order_state = 6, date_upd = NOW() WHERE id_supply_order = ?`, [id])
    await db.run(`
      INSERT INTO ps_supply_order_history
        (id_supply_order, id_employee, employee_lastname, employee_firstname, id_state, date_add)
      VALUES (?, 0, 'Hub', 'AC', 6, NOW())
    `, [id])

    return { ok: true, id, hardDelete: false, cancelled: true }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[bo/procurement/purchase-orders/:id DELETE] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'Erreur DB' })
  }
})
