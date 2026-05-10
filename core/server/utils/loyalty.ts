/**
 *
 * Loyalty utilities — automatic B2B points credit after payment confirmation.
 *
 * Specification 2026-05-07 (loyalty points email): a B2B customer
 * accumulates loyalty points proportional to the pre-tax amount of each order
 * VALIDATED (native state `paid=1`). Idempotent by `id_order`.
 *
 * Tables :
 *   - cs_loyalty_account    (1 row par customer, balance courant)
 *   - cs_loyalty_transaction (ledger : earn / spend / adjustment)
 *
 * Default ratio: **1 pt = 1 € pre-tax** (`total_paid_tax_excl` rounded).
 * If the ps_configuration table has a key `AC_LOYALTY_POINTS_PER_EURO`,
 * it is used instead (e.g., 5 → 5 pts per €).
 *
 * Called from:
 * - bo/orders/[id]/status.put.ts (admin manually validates the payment)
 * - payment/systempay-ipn.post.ts (credit card accepted → automatic state 2)
 * - orders/create.post.ts (rare: immediate payment at start)
 */
import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'

const SCHEMA = 'cs_main'

/**
 * Credits loyalty points for an order IF it is not cancelled /
 * in payment error, and has not already been credited. Silent no-op otherwise.
 *
 * Requirement (2026-05-07): credit from order creation (pending state
 * bank transfer included), not only after payment validation. Skip only
 * states 6 (cancelled) and 8 (payment error) — a future hook may revoke
 * if the order switches to these states afterwards.
 */
export async function creditLoyaltyForOrder(orderId: number): Promise<void> {
  if (!orderId || isNaN(orderId)) return
  const d = usePocPg()

  // 1. Skip si commande annulée (6) ou erreur paiement (8) — pas de crédit
  // pour des commandes qui ne génèrent pas de revenu.
  const stateRows: any[] = await d.execute(sql`
    SELECT current_state FROM ${sql.raw(SCHEMA)}.ps_orders WHERE id_order = ${orderId} LIMIT 1
  `) as any[]
  if (!stateRows[0]) return
  const currentState = Number(stateRows[0].current_state)
  if (currentState === 6 || currentState === 8) return

  // 2. Idempotence — déjà crédité pour cette commande ?
  const existing: any[] = await d.execute(sql`
    SELECT 1 FROM ${sql.raw(SCHEMA)}.cs_loyalty_transaction
     WHERE id_order = ${orderId} AND type = 'earn' LIMIT 1
  `) as any[]
  if (existing.length > 0) return

  // 3. Récup commande + customer
  const orderRows: any[] = await d.execute(sql`
    SELECT id_customer, reference, total_paid_tax_excl
      FROM ${sql.raw(SCHEMA)}.ps_orders WHERE id_order = ${orderId} LIMIT 1
  `) as any[]
  const order = orderRows[0]
  if (!order || !Number(order.id_customer)) return

  // 4. Calcul points : ratio configurable (default 1 pt = 1 €)
  const cfgRows: any[] = await d.execute(sql`
    SELECT value FROM ${sql.raw(SCHEMA)}.ps_configuration
     WHERE name = 'AC_LOYALTY_POINTS_PER_EURO' LIMIT 1
  `).catch(() => [] as any[]) as any[]
  const ratio = Number(cfgRows[0]?.value) || 1
  const points = Math.round(Number(order.total_paid_tax_excl || 0) * ratio)
  if (points <= 0) return

  const idCustomer = Number(order.id_customer)

  // 5. INSERT transaction
  await d.execute(sql`
    INSERT INTO ${sql.raw(SCHEMA)}.cs_loyalty_transaction
      (id_customer, type, points, id_order, reference, date_add)
    VALUES (${idCustomer}, 'earn', ${points}, ${orderId},
            ${String(order.reference || '')}, NOW())
  `)

  // 6. UPSERT account balance
  await d.execute(sql`
    INSERT INTO ${sql.raw(SCHEMA)}.cs_loyalty_account
      (id_customer, balance_points, total_earned, total_spent, date_add, date_upd)
    VALUES (${idCustomer}, ${points}, ${points}, 0, NOW(), NOW())
    ON CONFLICT (id_customer) DO UPDATE
      SET balance_points = ${sql.raw(SCHEMA)}.cs_loyalty_account.balance_points + ${points},
          total_earned   = ${sql.raw(SCHEMA)}.cs_loyalty_account.total_earned   + ${points},
          date_upd = NOW()
  `)

  console.log(`[loyalty] +${points} pts credit (customer ${idCustomer}, order ${orderId})`)
}
