/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { getListWithLines } from '~/modules/quickorder/server/utils/quickorder'

/** GET /api/bo/quick-order/lists/:id — List detail + items with product metadata. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  const result = await getListWithLines(id, { event })
  if (!result) throw createError({ statusCode: 404, statusMessage: 'liste introuvable' })

  return { ok: true, list: result.list, lines: result.lines }
})
