

import { addStopToTour } from '~/modules/routing/server/utils/routing'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  const body = await readBody<{
    customerLabel: string
    address?: string
    postcode?: string
    city?: string
    lat?: number
    lng?: number
    windowStart?: string
    windowEnd?: string
    weightKg?: number
    pallets?: number
    idOrder?: number
    idCustomer?: number
    notes?: string
  }>(event)

  if (!body?.customerLabel) throw createError({ statusCode: 400, statusMessage: 'customerLabel requis' })

  const { position } = await addStopToTour(
    id,
    {
      customerLabel: body.customerLabel,
      address: body.address ?? '',
      postcode: body.postcode ?? '',
      city: body.city ?? '',
      lat: body.lat ?? 0,
      lng: body.lng ?? 0,
      windowStart: body.windowStart || null,
      windowEnd: body.windowEnd || null,
      weightKg: body.weightKg ?? 0,
      pallets: body.pallets ?? 0,
      idOrder: body.idOrder ?? 0,
      idCustomer: body.idCustomer ?? 0,
      notes: body.notes ?? null,
    },
    { event },
  )

  return { ok: true, position }
})
