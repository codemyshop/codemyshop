

import { listExpertise } from '~/server/utils/expertise-db'

export default defineEventHandler(async (event) => {
  const { category = '', limit = '200', difficulty = '', all = '' } = getQuery(event)

  const articles = await listExpertise({
    category: category ? String(category) : undefined,
    difficulty: difficulty ? String(difficulty) : undefined,
    limit: Number(limit) || 200,
    includeFuture: !!all,
  })
  return articles
})
