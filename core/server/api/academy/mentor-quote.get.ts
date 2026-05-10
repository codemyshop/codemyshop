/**
 * GET /api/academy/mentor-quote?module_slug=xxx&lesson_index=0
 * Return the mentor's contextual insight for a given lesson — direct Drizzle DB.
 *
 */
import { getMentorQuote } from '~/server/utils/academy-db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const moduleSlug = String(query.module_slug ?? '').trim()
  const lessonIndex = Math.max(0, Number(query.lesson_index ?? 0))

  if (!moduleSlug) {
    return { success: false, quote: null, mentor: null, source: null }
  }

  const row = await getMentorQuote(moduleSlug, lessonIndex)
  return {
    success: true,
    quote: row.quote,
    mentor: row.mentor,
    source: row.source,
  }
})
