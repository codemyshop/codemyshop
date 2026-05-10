/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/expertise?category=X&limit=N&difficulty=X&all=1
 * Articles d'expertise PrestaShop depuis cs_expertise — Drizzle DB direct.
 */
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
