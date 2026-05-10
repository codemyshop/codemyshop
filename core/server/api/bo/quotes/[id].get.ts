/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { getQuoteRequestById, listItemsForQuoteRequest } from '~/modules/quote-request/server/utils/quote-request'

/** GET /api/bo/quotes/:id — quote request details (header + normalized items). */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  const quote = await getQuoteRequestById(id, { event })
  if (!quote) throw createError({ statusCode: 404, message: 'Devis introuvable' })

  const items = await listItemsForQuoteRequest(id, { event })
  return { quote: { ...quote, items } }
})
