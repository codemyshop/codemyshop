

import { searchSimilar } from '~/server/utils/centaure-embed'

export default defineEventHandler(async (event) => {
  const q = String(getQuery(event).q || '').trim()
  if (!q) {
    throw createError({ statusCode: 400, message: 'param "q" requis' })
  }
  const limit = Number(getQuery(event).limit || 5)
  const results = await searchSimilar(q, limit)
  return {
    query: q,
    backend: 'pgvector hnsw cosine, pseudo-embedding 384d',
    results,
  }
})
