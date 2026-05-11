

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  
  
  
  const parseFinite = (raw: unknown, dflt: number): number => {
    const n = Number(raw)
    return Number.isFinite(n) ? n : dflt
  }
  const ageMinH = Math.max(0, parseFinite(q.ageMinH, 24))
  const ageMaxH = Math.min(8760, parseFinite(q.ageMaxH, 720)) 
  const valueMin = Math.max(0, parseFinite(q.valueMin, 0))
  const onlyEligible = q.onlyEligible !== '0' && q.onlyEligible !== undefined

  const db = useClientDb(event)

  
  const buckets = await db.query<any>(`
    SELECT
      SUM(CASE WHEN ageh >= 1 AND ageh < 24 THEN 1 ELSE 0 END)  AS bucket_1_24h,
      SUM(CASE WHEN ageh >= 24 AND ageh < 72 THEN 1 ELSE 0 END) AS bucket_1_3d,
      SUM(CASE WHEN ageh >= 72 AND ageh < 168 THEN 1 ELSE 0 END) AS bucket_3_7d,
      SUM(CASE WHEN ageh >= 168 THEN 1 ELSE 0 END)              AS bucket_7d_plus,
      SUM(value_eur) AS value_total,
      COUNT(*) AS total
    FROM (
      SELECT c.id_cart,
             TIMESTAMPDIFF(HOUR, c.date_upd, NOW()) AS ageh,
             COALESCE(SUM(cp.quantity * pp.price), 0) AS value_eur
        FROM ps_cart c
        LEFT JOIN ps_cart_product cp ON cp.id_cart = c.id_cart
        LEFT JOIN ps_product pp ON pp.id_product = cp.id_product
       WHERE c.id_customer > 0
         AND NOT EXISTS (SELECT 1 FROM ps_orders o WHERE o.id_cart = c.id_cart)
         AND EXISTS (SELECT 1 FROM ps_cart_product cp2 WHERE cp2.id_cart = c.id_cart)
       GROUP BY c.id_cart
    ) sub
  `)
  const counters = buckets[0] || {}

  
  const recoveryStats = await db.query<any>(`
    SELECT
      COUNT(*) AS total_sent,
      SUM(CASE WHEN sent_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) AS sent_24h,
      SUM(CASE WHEN converted_at IS NOT NULL THEN 1 ELSE 0 END) AS total_converted
    FROM cs_cart_recovery
  `).catch(() => [{}])

  
  const ageFilter = `TIMESTAMPDIFF(HOUR, c.date_upd, NOW()) BETWEEN ${ageMinH} AND ${ageMaxH}`
  const valueFilter = valueMin > 0 ? `AND COALESCE(SUM(cp.quantity * pp.price), 0) >= ${valueMin}` : ''
  const cooldownDays = Number(q.cooldownDays) || 7
  const eligibleFilter = onlyEligible
    ? `AND NOT EXISTS (
         SELECT 1 FROM cs_cart_recovery r
          WHERE r.id_cart = c.id_cart
            AND r.sent_at >= DATE_SUB(NOW(), INTERVAL ${cooldownDays} DAY)
       )`
    : ''

  const carts = await db.query<any>(`
    SELECT
      c.id_cart,
      c.id_customer,
      c.date_add,
      c.date_upd,
      cu.email,
      CONCAT(cu.firstname, ' ', cu.lastname) AS customer_name,
      cu.company,
      cx.activity_code,
      TIMESTAMPDIFF(HOUR, c.date_upd, NOW()) AS age_hours,
      COUNT(cp.id_product) AS items_count,
      COALESCE(SUM(cp.quantity * pp.price), 0) AS total_estimated,
      (SELECT MAX(sent_at) FROM cs_cart_recovery r WHERE r.id_cart = c.id_cart) AS last_sent_at
    FROM ps_cart c
    JOIN ps_customer cu ON cu.id_customer = c.id_customer AND cu.active = 1
    LEFT JOIN cs_customer_extra cx ON cx.id_customer = c.id_customer
    LEFT JOIN ps_cart_product cp ON cp.id_cart = c.id_cart
    LEFT JOIN ps_product pp ON pp.id_product = cp.id_product
    WHERE c.id_customer > 0
      AND ${ageFilter}
      AND NOT EXISTS (SELECT 1 FROM ps_orders o WHERE o.id_cart = c.id_cart)
      AND EXISTS (SELECT 1 FROM ps_cart_product cp2 WHERE cp2.id_cart = c.id_cart)
      ${eligibleFilter}
    GROUP BY c.id_cart, cu.id_customer, cx.id_customer
    HAVING COUNT(cp.id_product) > 0 ${valueFilter ? '\n      ' + valueFilter.replace('AND ', 'AND ') : ''}
    ORDER BY total_estimated DESC, c.date_upd DESC
    LIMIT 500
  `)

  return {
    ok: true,
    counters: {
      bucket_1_24h: Number(counters.bucket_1_24h) || 0,
      bucket_1_3d: Number(counters.bucket_1_3d) || 0,
      bucket_3_7d: Number(counters.bucket_3_7d) || 0,
      bucket_7d_plus: Number(counters.bucket_7d_plus) || 0,
      value_total: Number(counters.value_total) || 0,
      total: Number(counters.total) || 0,
      total_sent: Number(recoveryStats[0]?.total_sent) || 0,
      sent_24h: Number(recoveryStats[0]?.sent_24h) || 0,
      total_converted: Number(recoveryStats[0]?.total_converted) || 0,
    },
    carts,
  }
})
