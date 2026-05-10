/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { createAvailability } from '~/enterprise/base/appointment/server/utils/appointment'

/**
 * POST /api/bo/appointment/availability — admin opens a time slot.
 * Body : { dateStart: ISO string, durationMin?: number, notes?: string }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const dateStartRaw = String(body?.dateStart ?? '').trim()
  const durationMin = Math.max(5, Math.min(240, Number(body?.durationMin ?? 30)))
  const notes = String(body?.notes ?? '').trim().slice(0, 255) || null

  if (!dateStartRaw) {
    throw createError({ statusCode: 422, statusMessage: 'dateStart requis' })
  }
  const dateStart = new Date(dateStartRaw)
  if (Number.isNaN(dateStart.getTime())) {
    throw createError({ statusCode: 422, statusMessage: 'dateStart invalide' })
  }
  if (dateStart.getTime() < Date.now() - 60_000) {
    throw createError({ statusCode: 422, statusMessage: 'Créneau dans le passé' })
  }

  const id = await createAvailability({ dateStart, durationMin, notes }, { event })
  return { success: true, id }
})
