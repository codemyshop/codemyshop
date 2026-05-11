

import { createTour } from '~/modules/routing/server/utils/routing'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    label: string
    tourDate: string
    idVehicle?: number
    idDriver?: number
    depotLat?: number
    depotLng?: number
  }>(event)

  if (!body?.label) throw createError({ statusCode: 400, statusMessage: 'label requis' })
  if (!body?.tourDate) throw createError({ statusCode: 400, statusMessage: 'tourDate (YYYY-MM-DD) requis' })

  await createTour(
    {
      label: body.label,
      tourDate: body.tourDate,
      idVehicle: body.idVehicle ?? 0,
      idDriver: body.idDriver ?? 0,
      depotLat: body.depotLat ?? 48.8235,
      depotLng: body.depotLng ?? 2.3536,
    },
    { event },
  )
  return { ok: true }
})
