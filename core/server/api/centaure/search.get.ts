/**
 *
 * GET /api/centaure/search?q=<query>&limit=<n>
 *
 * POC pgvector — similarity search live on the indexed corpus via
 * cs_centaure_embedding. Demonstrates the end-to-end pipeline.
 * (chantier #38 criterion #2).
 */

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
