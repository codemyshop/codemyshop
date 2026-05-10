/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { updateStop, STOP_STATUSES, type StopStatus } from '~/modules/routing/server/utils/routing'

/** PUT /api/bo/routing/stops/:id — updates status, coords, position, notes. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  const body = await readBody<{
    status?: StopStatus
    position?: number
    lat?: number
    lng?: number
    address?: string
    postcode?: string
    city?: string
    windowStart?: string | null
    windowEnd?: string | null
    weightKg?: number
    pallets?: number
    notes?: string
  }>(event)

  if (body.status && !STOP_STATUSES.includes(body.status)) {
    throw createError({ statusCode: 400, statusMessage: `status ∈ ${STOP_STATUSES.join('|')}` })
  }

  const hasField = Object.values(body).some((v) => v !== undefined)
  if (!hasField) throw createError({ statusCode: 400, statusMessage: 'aucun champ à mettre à jour' })

  await updateStop(id, body, { event })
  return { ok: true }
})
