/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { deleteStop } from '~/modules/routing/server/utils/routing'

/** DELETE /api/bo/routing/stops/:id — deletes a stop. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id') || 0)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id requis' })

  await deleteStop(id, { event })
  return { ok: true }
})
