

import { getSuggestion } from '~/server/utils/academy-db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const moduleSlug = String(query.module_slug ?? '').trim()
  const lessonIndex = Math.max(0, Number(query.lesson_index ?? 0))

  if (!moduleSlug) {
    throw createError({ statusCode: 422, message: 'module_slug requis' })
  }

  const question = await getSuggestion(moduleSlug, lessonIndex)
  return { success: true, question }
})
