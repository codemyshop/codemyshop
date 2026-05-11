

import {
  getOrCreateRowPg,
  updateAvailabilityPg,
  type AvailabilityRow,
} from '~/server/utils/availability-pg'

const FALLBACK = {
  maxClients: 2,
  currentClients: 0,
  month: new Date().toISOString().slice(0, 7),
  available: true,
}

function shape(row: AvailabilityRow) {
  return {
    success: true,
    maxClients: Number(row.max_clients),
    currentClients: Number(row.current_clients),
    month: String(row.month),
    available: Number(row.current_clients) < Number(row.max_clients),
  }
}

export default defineEventHandler(async (event) => {
  if (event.method === 'POST') {
    try {
      const body = await readBody<{ currentClients?: number; maxClients?: number }>(event).catch(() => ({}))
      const row = await getOrCreateRowPg()
      await updateAvailabilityPg(row.id_availability, body || {})
      if (body?.currentClients !== undefined && body.currentClients !== null) {
        row.current_clients = Number(body.currentClients)
      }
      if (body?.maxClients !== undefined && body.maxClients !== null) {
        row.max_clients = Number(body.maxClients)
      }
      return shape(row)
    } catch (err: any) {
      console.warn('[availability] POST fallback:', err?.message)
      return FALLBACK
    }
  }

  try {
    const row = await getOrCreateRowPg()
    return shape(row)
  } catch (err: any) {
    console.warn('[availability] GET fallback:', err?.message)
    return FALLBACK
  }
})
