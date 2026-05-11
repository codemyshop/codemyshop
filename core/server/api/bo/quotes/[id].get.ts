

import { getQuoteRequestById, listItemsForQuoteRequest } from '~/modules/quote-request/server/utils/quote-request'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  const quote = await getQuoteRequestById(id, { event })
  if (!quote) throw createError({ statusCode: 404, message: 'Devis introuvable' })

  const items = await listItemsForQuoteRequest(id, { event })
  return { quote: { ...quote, items } }
})
