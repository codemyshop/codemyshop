/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { updateAppointmentStatus } from '~/enterprise/base/appointment/server/utils/appointment'

/**
 * PATCH /api/bo/appointment/{id} — admin changes an appointment's status.
 * Body : { status: 'pending' | 'confirmed' | 'cancelled' | 'done' }
 */
const ALLOWED = ['pending', 'confirmed', 'cancelled', 'done'] as const

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }
  const body = await readBody(event)
  const status = String(body?.status ?? '').trim()
  if (!ALLOWED.includes(status as any)) {
    throw createError({ statusCode: 422, statusMessage: `status invalide (${ALLOWED.join('|')})` })
  }
  const r = await updateAppointmentStatus(id, status as any, { event })
  if (!r.updated) {
    throw createError({ statusCode: 404, statusMessage: 'Appointment introuvable' })
  }
  return { success: true }
})
