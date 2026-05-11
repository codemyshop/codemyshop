

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'

const SCHEMA = 'cs_main'

export async function creditLoyaltyForOrder(orderId: number): Promise<void> {
  if (!orderId || isNaN(orderId)) return
  const d = usePocPg()

  
  
  const stateRows: any[] = await d.execute(sql`
    SELECT current_state FROM ${sql.raw(SCHEMA)}.ps_orders WHERE id_order = ${orderId} LIMIT 1
  `) as any[]
  if (!stateRows[0]) return
  const currentState = Number(stateRows[0].current_state)
  if (currentState === 6 || currentState === 8) return

  
  const existing: any[] = await d.execute(sql`
    SELECT 1 FROM ${sql.raw(SCHEMA)}.cs_loyalty_transaction
     WHERE id_order = ${orderId} AND type = 'earn' LIMIT 1
  `) as any[]
  if (existing.length > 0) return

  
  const orderRows: any[] = await d.execute(sql`
    SELECT id_customer, reference, total_paid_tax_excl
      FROM ${sql.raw(SCHEMA)}.ps_orders WHERE id_order = ${orderId} LIMIT 1
  `) as any[]
  const order = orderRows[0]
  if (!order || !Number(order.id_customer)) return

  
  const cfgRows: any[] = await d.execute(sql`
    SELECT value FROM ${sql.raw(SCHEMA)}.ps_configuration
     WHERE name = 'AC_LOYALTY_POINTS_PER_EURO' LIMIT 1
  `).catch(() => [] as any[]) as any[]
  const ratio = Number(cfgRows[0]?.value) || 1
  const points = Math.round(Number(order.total_paid_tax_excl || 0) * ratio)
  if (points <= 0) return

  const idCustomer = Number(order.id_customer)

  
  await d.execute(sql`
    INSERT INTO ${sql.raw(SCHEMA)}.cs_loyalty_transaction
      (id_customer, type, points, id_order, reference, date_add)
    VALUES (${idCustomer}, 'earn', ${points}, ${orderId},
            ${String(order.reference || '')}, NOW())
  `)

  
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
