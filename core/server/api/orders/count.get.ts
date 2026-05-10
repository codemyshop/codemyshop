/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/orders/count?customerId=...&clientId=...
 *
 * Returns the number of orders by the customer. Used to detect a
 * first order (count===0) and display the PROMO5 promotion in the cart.
 * Direct DB (Zero PrestaShop webservice policy).
 */
import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { customerId } = getQuery(event) as Record<string, string>
  const idCustomer = Number(customerId)
  if (!idCustomer) throw createError({ statusCode: 400, message: 'customerId requis' })

  const db = useClientDb(event)
  // commande est passée, peu importe son état (paiement validé vs en attente
  // virement). On compte toutes les commandes sauf annulées (state=6) ou en
  // erreur paiement (state=8) pour ne pas pénaliser un user qui a raté sa CB.
  const row = await db.get<{ count: number }>(
    `SELECT COUNT(*)::int AS count
       FROM ps_orders
      WHERE id_customer = ?
        AND current_state NOT IN (6, 8)`,
    [idCustomer],
  )
  return { count: Number(row?.count ?? 0) }
})
