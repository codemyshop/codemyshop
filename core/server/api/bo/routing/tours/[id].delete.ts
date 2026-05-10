/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { deleteTour } from '~/modules/routing/server/utils/routing'

/** DELETE /api/bo/routing/tours/:id — deletes a tour and its stops. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  await deleteTour(id, { event })
  return { ok: true }
})
