

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'

export default defineEventHandler(async (_event) => {
  const d = usePocPg()
  const statuses: any[] = await d.execute(sql`
    SELECT os.id_order_state AS "id", osl.name, os.color
    FROM cs_main.ps_order_state os
    JOIN cs_main.ps_order_state_lang osl ON osl.id_order_state = os.id_order_state AND osl.id_lang = 1
    ORDER BY os.id_order_state
  `) as any[]
  return { statuses }
})
