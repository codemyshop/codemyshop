

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  const q = getQuery(event) as Record<string, string>
  const showAll = q.all === '1'

  const carriers = await db.query<any>(`
    SELECT c.id_carrier, c.name, c.active, c.is_free, c.shipping_handling,
           c.max_width, c.max_height, c.max_depth, c.max_weight,
           c.grade, c.position,
           cl.delay,
           STRING_AGG(DISTINCT z.name, ', ' ORDER BY z.name) AS zones
    FROM ps_carrier c
    LEFT JOIN ps_carrier_lang cl ON cl.id_carrier = c.id_carrier AND cl.id_lang = 1
    LEFT JOIN ps_carrier_zone cz ON cz.id_carrier = c.id_carrier
    LEFT JOIN ps_zone z ON z.id_zone = cz.id_zone
    WHERE c.deleted = 0 ${showAll ? '' : 'AND c.active = 1'}
    GROUP BY c.id_carrier, c.name, c.active, c.is_free, c.shipping_handling,
             c.max_width, c.max_height, c.max_depth, c.max_weight,
             c.grade, c.position, cl.delay
    ORDER BY c.position, c.name
  `)

  
  for (const carrier of carriers) {
    const ranges = await db.query<any>(`
      SELECT d.id_range_weight, d.id_range_price,
             COALESCE(rw.delimiter1, rp.delimiter1) AS range_min,
             COALESCE(rw.delimiter2, rp.delimiter2) AS range_max,
             d.price
      FROM ps_delivery d
      LEFT JOIN ps_range_weight rw ON rw.id_range_weight = d.id_range_weight AND d.id_range_weight > 0
      LEFT JOIN ps_range_price rp ON rp.id_range_price = d.id_range_price AND d.id_range_price > 0
      WHERE d.id_carrier = ?
      ORDER BY range_min
    `, [carrier.id_carrier])
    carrier.deliveryRanges = ranges
  }

  return { carriers, total: carriers.length }
})
