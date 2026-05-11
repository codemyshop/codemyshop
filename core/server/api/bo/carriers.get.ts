

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)

  const carriers = await db.query<any>(`
    SELECT
      c.id_reference    AS id,
      c.id_carrier      AS idCarrier,
      c.name,
      c.is_free         AS isFree,
      c.is_module       AS isModule,
      c.shipping_external AS shippingExternal,
      c.position,
      COALESCE(cl.delay, '') AS delay
    FROM ps_carrier c
    LEFT JOIN ps_carrier_lang cl
      ON cl.id_carrier = c.id_carrier AND cl.id_lang = 1
    WHERE c.deleted = 0
      AND c.active = 1
      AND c.id_carrier = (
        SELECT MAX(c2.id_carrier)
        FROM ps_carrier c2
        WHERE c2.id_reference = c.id_reference
          AND c2.deleted = 0
      )
    ORDER BY c.position, c.name
  `)

  return { carriers }
})
