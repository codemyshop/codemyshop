/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * PUT /api/bo/procurement/purchase-orders/:id — state transition or delivery update.
 * Body: { stateId?, deliveryDate?, receipts?: { [idDetail]: quantityReceived } }
 *
 * - stateId: state transition (written in ps_supply_order_history).
 * - deliveryDate: update expected delivery date.
 * - receipts: updates quantity_received per line (used in receipt state).
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  const body = await readBody<any>(event)
  const db = useClientDb(event)

  try {
    const order = await db.get<any>(`SELECT id_supply_order, id_supply_order_state FROM ps_supply_order WHERE id_supply_order = ? LIMIT 1`, [id])
    if (!order) throw createError({ statusCode: 404, statusMessage: 'BC introuvable' })

    const updates: string[] = []
    const params: any[] = []

    // Transition d'état
    if (body.stateId !== undefined && Number(body.stateId) !== Number(order.id_supply_order_state)) {
      const newStateId = Number(body.stateId)
      const stateExists = await db.get<any>(`SELECT id_supply_order_state FROM ps_supply_order_state WHERE id_supply_order_state = ?`, [newStateId])
      if (!stateExists) throw createError({ statusCode: 422, statusMessage: 'État invalide' })

      updates.push('id_supply_order_state = ?'); params.push(newStateId)

      // Trace dans l'historique
      await db.run(`
        INSERT INTO ps_supply_order_history
          (id_supply_order, id_employee, employee_lastname, employee_firstname, id_state, date_add)
        VALUES (?, 0, 'Hub', 'AC', ?, NOW())
      `, [id, newStateId])
    }

    // Date de livraison
    if (body.deliveryDate !== undefined) {
      updates.push('date_delivery_expected = ?'); params.push(body.deliveryDate || null)
    }

    if (updates.length) {
      updates.push('date_upd = NOW()')
      await db.run(`UPDATE ps_supply_order SET ${updates.join(', ')} WHERE id_supply_order = ?`, [...params, id])
    }

    // Réceptions par ligne
    if (body.receipts && typeof body.receipts === 'object') {
      for (const [idDetail, qty] of Object.entries(body.receipts)) {
        const q = Math.max(0, Number(qty || 0))
        await db.run(
          `UPDATE ps_supply_order_detail
           SET quantity_received = ?
           WHERE id_supply_order_detail = ? AND id_supply_order = ?`,
          [q, Number(idDetail), id],
        )
      }
    }

    return { ok: true, id }
  } catch (err: any) {
    if (err.statusCode) throw err
    console.error('[bo/procurement/purchase-orders/:id PUT] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'Erreur DB : ' + (err?.message || '') })
  }
})
