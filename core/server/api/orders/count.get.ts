

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { customerId } = getQuery(event) as Record<string, string>
  const idCustomer = Number(customerId)
  if (!idCustomer) throw createError({ statusCode: 400, message: 'customerId requis' })

  const db = useClientDb(event)
  
  
  
  const row = await db.get<{ count: number }>(
    `SELECT COUNT(*)::int AS count
       FROM ps_orders
      WHERE id_customer = ?
        AND current_state NOT IN (6, 8)`,
    [idCustomer],
  )
  return { count: Number(row?.count ?? 0) }
})
