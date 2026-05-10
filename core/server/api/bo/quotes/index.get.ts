/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { countQuoteRequests, listQuoteRequests } from '~/modules/quote-request/server/utils/quote-request'

/**
 * GET /api/bo/quotes — paginated list of quote requests.
 * Table backend : cs_quote_request (module ac_quoterequest).
 * URL kept at /api/bo/quotes for existing UI compatibility.
 * Query: ?page=1&perPage=30&search=…&status=pending
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page || 1))
  const perPage = Math.min(10000, Math.max(1, Number(q.perPage || 100)))
  const search = (q.search || '').trim() || undefined
  const status = (q.status || '').trim() || undefined

  try {
    const total = await countQuoteRequests({ search, status }, { event })
    const offset = (page - 1) * perPage
    const quotes = await listQuoteRequests({ search, status, perPage, offset }, { event })
    return { quotes, total, page, perPage, totalPages: Math.ceil(total / perPage) }
  } catch (err: any) {
    console.error('[bo/quotes] DB error:', err?.message)
    return { quotes: [], total: 0, page, perPage, totalPages: 0 }
  }
})
