/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { deleteList } from '~/modules/quickorder/server/utils/quickorder'

/** DELETE /api/bo/quick-order/lists/:id — Delete a list and its items. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  await deleteList(id, { event })
  return { ok: true }
})
