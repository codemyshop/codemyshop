

import { getRouterParam } from 'h3'
import { listRegistrationsForEvent } from '~/server/utils/events'

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'id') ?? ''
  return await listRegistrationsForEvent(eventId)
})
