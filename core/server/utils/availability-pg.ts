

import { sql } from 'drizzle-orm'
import { usePocPg } from '../db/drizzle-pg'

export interface AvailabilityRow {
  id_availability: number
  max_clients: number
  current_clients: number
  month: string
}

export async function getOrCreateRowPg(): Promise<AvailabilityRow> {
  const d = usePocPg()
  const now = new Date().toISOString().slice(0, 7)

  const sel = await d.execute<any>(sql`
    SELECT id_availability, max_clients, current_clients, month
      FROM cs_main.cs_availability
     ORDER BY id_availability ASC
     LIMIT 1
  `)
  let row: AvailabilityRow | null = ((sel as any) as any[])[0]
    ? {
        id_availability: Number(((sel as any) as any[])[0].id_availability),
        max_clients: Number(((sel as any) as any[])[0].max_clients),
        current_clients: Number(((sel as any) as any[])[0].current_clients),
        month: String(((sel as any) as any[])[0].month),
      }
    : null

  if (!row) {
    const ins = await d.execute<any>(sql`
      INSERT INTO cs_main.cs_availability
          (max_clients, current_clients, month, date_add, date_upd)
       VALUES (2, 0, ${now}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id_availability
    `)
    const newId = Number(((ins as any) as any[])[0]?.id_availability ?? 0)
    row = { id_availability: newId, max_clients: 2, current_clients: 0, month: now }
  } else if (row.month !== now) {
    await d.execute(sql`
      UPDATE cs_main.cs_availability
         SET current_clients = 0, month = ${now}, date_upd = CURRENT_TIMESTAMP
       WHERE id_availability = ${row.id_availability}
    `)
    row.current_clients = 0
    row.month = now
  }

  return row
}

export interface AvailabilityPatch {
  currentClients?: number
  maxClients?: number
}

export async function updateAvailabilityPg(
  idAvailability: number,
  patch: AvailabilityPatch,
): Promise<void> {
  const sets: any[] = []
  if (patch.currentClients !== undefined && patch.currentClients !== null) {
    sets.push(sql`current_clients = ${Number(patch.currentClients)}`)
  }
  if (patch.maxClients !== undefined && patch.maxClients !== null) {
    sets.push(sql`max_clients = ${Number(patch.maxClients)}`)
  }
  if (!sets.length) return
  sets.push(sql`date_upd = CURRENT_TIMESTAMP`)
  await usePocPg().execute(sql`
    UPDATE cs_main.cs_availability
       SET ${sql.join(sets, sql`, `)}
     WHERE id_availability = ${idAvailability}
  `)
}
