/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET  /api/availability → { maxClients, currentClients, month, available }
 * POST /api/availability { currentClients?, maxClients? } → updates the counter
 *
 * PostgreSQL DB direct (cs_main.cs_availability, single-tenant
 * hub) with monthly auto-reset: if the current month differs from the stored
 * month, current_clients resets to 0 (gate re-init).
 *
 * Fallback: if the table does not exist (tenants that do not include
 * the slot feature), return a neutral `available: true`.
 *
 * Runtime 100% PG, MariaDB branch dropped.
 */
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
