

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'

export default defineEventHandler(async () => {
  const d = usePocPg()
  const open = (await d.execute(sql`
    SELECT * FROM cs_main.cs_daily_meet
     WHERE status NOT IN ('resolved', 'dismissed')
     ORDER BY CASE severity
       WHEN 'P0' THEN 1
       WHEN 'critical' THEN 2
       WHEN 'warning' THEN 3
       WHEN 'info' THEN 4
       ELSE 5
     END, date_add DESC
  `) as any[]) ?? []
  const resolved = (await d.execute(sql`
    SELECT * FROM cs_main.cs_daily_meet
     WHERE status IN ('resolved', 'dismissed')
     ORDER BY date_upd DESC LIMIT 10
  `) as any[]) ?? []
  return {
    open,
    resolved,
    totalOpen: open.length,
    totalResolved: resolved.length,
  }
})
