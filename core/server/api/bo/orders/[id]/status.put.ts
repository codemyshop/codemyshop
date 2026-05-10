/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { sendOrderShippedEmail } from '~/server/utils/order-emails'
import { creditLoyaltyForOrder } from '~/server/utils/loyalty'

/**
 * PUT /api/bo/orders/:id/status — change the status of an order.
 * Body: { statusId: number, employeeId?: number }
 *
 * Side-effects (best-effort, never blocking):
 *   - state.shipped=1 → envoi template `order_shipped` (carrier + tracking)
 * - state.paid=1 → credit loyalty (1 pt = 1 € HT, idempotent by id_order)
 * Incident 2026-05-07 ("Loyalty points" email): no hook
 * allocation → wire transfer payment orders never credited points.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  const { statusId, employeeId } = await readBody<{ statusId: number; employeeId?: number }>(event)
  if (!statusId) throw createError({ statusCode: 400, message: 'statusId requis' })

  const d = usePocPg()
  const orderId = Number(id)

  const orderRows: any[] = await d.execute(sql`SELECT id_order, current_state FROM cs_main.ps_orders WHERE id_order = ${orderId}`) as any[]
  const order = orderRows?.[0]
  if (!order) throw createError({ statusCode: 404, message: 'Commande introuvable' })

  if (order.current_state === statusId) return { success: true, message: 'Statut déjà à jour' }

  await d.execute(sql`
    INSERT INTO cs_main.ps_order_history (id_order, id_order_state, id_employee, date_add)
    VALUES (${orderId}, ${statusId}, ${employeeId || 0}, NOW())
  `)

  await d.execute(sql`UPDATE cs_main.ps_orders SET current_state = ${statusId}, date_upd = NOW() WHERE id_order = ${orderId}`)

  // ─── Email shipped si le state cible est marqué shipped (PS natif) ───
  // Best-effort : log + continue. Pas de blocage du status update si le mail
  // échoue (ex: état "Expédiée" sans transporteur lié, customer supprimé).
  notifyIfShipped(d, orderId, statusId).catch((err: any) => {
    console.error(`[orders/${orderId}/status] notify shipped échoué:`, err?.message || err)
  })

  // ─── Crédit loyalty si le state cible porte le flag paid (PS natif) ───
  // Helper réutilisable (cf core/server/utils/loyalty.ts) — idempotent par id_order.
  creditLoyaltyForOrder(orderId).catch((err: any) => {
    console.error(`[orders/${orderId}/status] credit loyalty échoué:`, err?.message || err)
  })

  return { success: true }
})

async function notifyIfShipped(d: ReturnType<typeof usePocPg>, orderId: number, statusId: number): Promise<void> {
  const stateRows: any[] = await d.execute(sql`
    SELECT shipped FROM cs_main.ps_order_state WHERE id_order_state = ${statusId} LIMIT 1
  `) as any[]
  if (!stateRows[0] || Number(stateRows[0].shipped) !== 1) return

  const ctxRows: any[] = await d.execute(sql`
    SELECT o.reference, c.email, c.firstname,
           oc.tracking_number, ca.name AS carrier_name, ca.url AS carrier_url,
           cfg.value AS shop_name
      FROM cs_main.ps_orders o
      JOIN cs_main.ps_customer c ON c.id_customer = o.id_customer
      LEFT JOIN cs_main.ps_order_carrier oc ON oc.id_order = o.id_order
      LEFT JOIN cs_main.ps_carrier ca ON ca.id_carrier = oc.id_carrier
      LEFT JOIN cs_main.ps_configuration cfg ON cfg.name = 'PS_SHOP_NAME'
     WHERE o.id_order = ${orderId}
     LIMIT 1
  `) as any[]
  const ctx = ctxRows[0]
  if (!ctx?.email) return

  const carrier = String(ctx.carrier_name || '')
  const trackingUrl = ctx.carrier_url && ctx.tracking_number
    ? String(ctx.carrier_url).replace('@', String(ctx.tracking_number))
    : ''
  const shopName = String(ctx.shop_name || 'Boutique')

  await sendOrderShippedEmail(
    String(ctx.email),
    String(ctx.firstname || ''),
    String(ctx.reference),
    carrier,
    trackingUrl,
    shopName,
  )
  console.log(`[orders/${orderId}/status] order_shipped email sent to ${ctx.email}`)
}
