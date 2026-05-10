/**
 *
 * GET /api/shelves?client_id=ac-hub&section_type=hero
 * Returns shelves from cs_shelf — Direct Drizzle DB.
 */
import { getShelfById, listShelves } from '~/server/utils/shelves-db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  // Single shelf by id
  const id = Number(query.id || 0)
  if (id > 0) {
    const shelf = await getShelfById(id)
    if (!shelf) {
      throw createError({ statusCode: 404, message: 'Shelf introuvable' })
    }
    return { shelf }
  }

  const shelves = await listShelves({
    clientId: query.client_id ? String(query.client_id) : undefined,
    sectionType: query.section_type ? String(query.section_type) : undefined,
    active: query.active !== undefined ? String(query.active) as any : undefined,
  })
  return { shelves, count: shelves.length }
})
