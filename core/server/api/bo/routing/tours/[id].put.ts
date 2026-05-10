/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { updateTour, TOUR_STATUSES, type TourStatus } from '~/modules/routing/server/utils/routing'

/** PUT /api/bo/routing/tours/:id — updates label, date, vehicle, driver, status. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  const body = await readBody<{
    label?: string
    tourDate?: string
    idVehicle?: number
    idDriver?: number
    depotLat?: number
    depotLng?: number
    status?: TourStatus
  }>(event)

  if (body.status && !TOUR_STATUSES.includes(body.status)) {
    throw createError({ statusCode: 400, statusMessage: `status ∈ ${TOUR_STATUSES.join('|')}` })
  }

  const hasField =
    body.label !== undefined ||
    body.tourDate !== undefined ||
    body.idVehicle !== undefined ||
    body.idDriver !== undefined ||
    body.depotLat !== undefined ||
    body.depotLng !== undefined ||
    body.status !== undefined
  if (!hasField) throw createError({ statusCode: 400, statusMessage: 'aucun champ à mettre à jour' })

  await updateTour(id, body, { event })
  return { ok: true }
})
