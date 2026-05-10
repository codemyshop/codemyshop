/**
 *
 * GET /api/events/:id/registrations → registrations list (admin) — direct Drizzle DB access.
 */
import { getRouterParam } from 'h3'
import { listRegistrationsForEvent } from '~/server/utils/events'

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'id') ?? ''
  return await listRegistrationsForEvent(eventId)
})
