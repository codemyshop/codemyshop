/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * POST /api/bo/customers/bulk-delete — suppression en lot depuis /hub/contacts.
 *
 * Body: { ids: number[] }
 *
 * Soft delete (UPDATE ps_customer SET deleted=1) — pattern natif PS.
 * Preserve FK integrity of orders and addresses: an account
 * deleted no longer appears in the list but remains linked to orders
 * historiques (audit + support juridique conservation).
 *
 * Response: { deleted: number, skipped: number }
 * - deleted: rows actually set to deleted=1
 * - skipped: IDs already deleted or non-existent
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event) as { ids?: Array<number | string> }
  const idsRaw = Array.isArray(body?.ids) ? body.ids : []
  const ids = idsRaw
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0)
  if (!ids.length) {
    throw createError({ statusCode: 400, statusMessage: 'ids array required' })
  }

  const db = useClientDb(event)
  try {
    const placeholders = ids.map(() => '?').join(',')
    const res = await db.run(
      `UPDATE ps_customer SET deleted = 1, date_upd = NOW() WHERE id_customer IN (${placeholders}) AND deleted = 0`,
      ids,
    )
    const deleted = Number(res?.affectedRows || 0)
    return {
      ok: true,
      deleted,
      skipped: ids.length - deleted,
    }
  } catch (err: any) {
    console.error('[bo/customers/bulk-delete] DB error:', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'DB error' })
  }
})
