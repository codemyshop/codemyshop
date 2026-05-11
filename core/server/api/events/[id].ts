

import { getMethod, readBody, createError, getRouterParam } from 'h3'
import type { EventRecord } from '~/types/event'
import { deleteEvent, getEventById, updateEvent } from '~/server/utils/events'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const id     = getRouterParam(event, 'id') ?? ''

  if (method === 'GET') {
    const row = await getEventById(id)
    if (!row) throw createError({ statusCode: 404, message: `Événement "${id}" introuvable` })
    return row
  }

  if (method === 'PUT') {
    const body = await readBody<Partial<EventRecord>>(event)
    const updated = await updateEvent(id, body)
    if (!updated) throw createError({ statusCode: 404, message: `Événement "${id}" introuvable` })
    return updated
  }

  if (method === 'DELETE') {
    const existing = await getEventById(id)
    if (!existing) throw createError({ statusCode: 404, message: `Événement "${id}" introuvable` })
    await deleteEvent(id)
    return { deleted: existing.id }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
