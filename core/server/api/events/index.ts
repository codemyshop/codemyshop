

import { getMethod, readBody, createError, getQuery } from 'h3'
import type { EventRecord } from '~/types/event'
import { createEvent, readEvents } from '~/server/utils/events'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if (method === 'GET') {
    const query  = getQuery(event)
    let events = await readEvents()
    if (query.clientId) events = events.filter(e => e.clientId === query.clientId)
    if (query.status)   events = events.filter(e => e.status   === query.status)
    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  if (method === 'POST') {
    const body = await readBody<Partial<EventRecord>>(event)
    if (!body.title || !body.date || !body.type) {
      throw createError({ statusCode: 400, message: 'title, date et type sont requis' })
    }
    return await createEvent(body)
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
