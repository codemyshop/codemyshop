/**
 *
 * GET /api/hub/authors — list of employees with author profile (direct Drizzle DB).
 */
import { listAuthors } from '~/server/utils/hub-authors-db'

export default defineEventHandler(async () => {
  return await listAuthors()
})
