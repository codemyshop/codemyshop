/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { deleteAvailability } from '~/enterprise/base/appointment/server/utils/appointment'

/**
 * DELETE /api/bo/appointment/availability/{id} — admin removes an available slot.
 * Rejected if the slot is already booked (use PATCH appointment status=cancelled).
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }
  const r = await deleteAvailability(id, { event })
  if (!r.deleted) {
    throw createError({ statusCode: 409, statusMessage: r.reason || 'Suppression impossible' })
  }
  return { success: true }
})
