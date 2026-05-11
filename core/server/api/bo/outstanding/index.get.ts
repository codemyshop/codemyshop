

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { limit } = getQuery(event) as Record<string, string>
  const db = useClientDb(event)

  try {
    const customers = await db.query<any>(`
      SELECT
        c.id_customer        AS id,
        c.firstname,
        c.lastname,
        c.email,
        c.company,
        c.outstanding_allow_amount AS outstandingAllowAmount,
        c.max_payment_days   AS maxPaymentDays
      FROM ps_customer c
      WHERE c.outstanding_allow_amount > 0
      ORDER BY c.outstanding_allow_amount DESC
      LIMIT ?
    `, [Number(limit || 100)])

    return { customers, total: customers.length }
  } catch (err: any) {
    console.error('[bo/outstanding] DB error:', err?.message)
    return { customers: [], total: 0 }
  }
})
