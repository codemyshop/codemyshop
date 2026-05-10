/**
 *
 * DELETE /api/shelves?id=42 — Delete a shelf — Direct Drizzle DB.
 */
import { deleteShelf } from '~/server/utils/shelves-db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = Number(query.id)

  const result = await deleteShelf(id)
  if (!result.ok) {
    throw createError({ statusCode: result.status || 500, message: result.error || 'deleteShelf KO' })
  }
  return { ok: true, id: result.id, action: 'deleted' }
})
