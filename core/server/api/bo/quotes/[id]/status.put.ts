/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { updateQuoteRequestStatus } from '~/modules/quote-request/server/utils/quote-request'

/** PUT /api/bo/quotes/:id/status — changes the status of a quote. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  const { status, noteInterne } = await readBody<{ status: string; noteInterne?: string }>(event)
  const validStatuses = ['pending', 'processing', 'sent', 'accepted', 'refused', 'expired']
  if (!validStatuses.includes(status)) throw createError({ statusCode: 400, message: 'Statut invalide' })

  await updateQuoteRequestStatus(id, status, noteInterne, { event })
  return { success: true }
})
