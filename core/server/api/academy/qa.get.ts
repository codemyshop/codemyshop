

import { getQaForModule } from '~/server/utils/academy-db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const moduleSlug = String(query.module_slug ?? '').trim()

  if (!moduleSlug) {
    throw createError({ statusCode: 422, message: 'module_slug requis' })
  }

  const lessonIdx = (query.lesson_index !== undefined && query.lesson_index !== '')
    ? Number(query.lesson_index)
    : null

  const qa = await getQaForModule(moduleSlug, lessonIdx)
  return { success: true, qa, total: qa.length }
})
