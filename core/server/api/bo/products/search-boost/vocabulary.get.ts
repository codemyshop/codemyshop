/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'

/**
 * GET /api/bo/products/search-boost/vocabulary — indexed vocabulary.
 * Returns the most frequent words in ps_search_index (weighted
 * frequency summed by word), top N of the searchable catalog.
 *
 * Query: ?search=…&limit=100
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const search = (q.search || '').trim()
  const limit  = Math.max(10, Math.min(500, Number(q.limit || 100)))
  const db = useClientDb(event)

  try {
    const params: any[] = []
    let where = 'WHERE sw.id_lang = 1'
    if (search) {
      where += ` AND sw.word LIKE ?`
      params.push(`%${search}%`)
    }

    const [words, stats] = await Promise.all([
      db.query<any>(`
        SELECT
          sw.id_word                                            AS id,
          sw.word,
          COALESCE(SUM(si.weight), 0)                           AS totalWeight,
          COUNT(DISTINCT si.id_product)                         AS productCount
        FROM ps_search_word sw
        LEFT JOIN ps_search_index si ON si.id_word = sw.id_word
        ${where}
        GROUP BY sw.id_word, sw.word
        ORDER BY totalWeight DESC, sw.word ASC
        LIMIT ?
      `, [...params, limit]),
      db.get<any>(`
        SELECT
          COUNT(DISTINCT sw.id_word)                            AS totalWords,
          COUNT(DISTINCT si.id_product)                         AS indexedProducts
        FROM ps_search_word sw
        LEFT JOIN ps_search_index si ON si.id_word = sw.id_word
        WHERE sw.id_lang = 1
      `),
    ])

    return {
      totalWords:       Number(stats?.totalWords || 0),
      indexedProducts:  Number(stats?.indexedProducts || 0),
      words: words.map((w: any) => ({
        id:           Number(w.id),
        word:         w.word,
        totalWeight:  Number(w.totalWeight || 0),
        productCount: Number(w.productCount || 0),
      })),
    }
  } catch (err: any) {
    console.error('[bo/products/search-boost/vocabulary] DB error:', err?.message)
    return { totalWords: 0, indexedProducts: 0, words: [] }
  }
})
