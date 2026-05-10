/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { deleteProductCatchWeight } from '~/enterprise/vertical-food/catchweight/server/utils/catchweight'

/** DELETE /api/bo/catch-weight/flag/:idProduct — removes the variable weight flag. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'idProduct'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'idProduct invalide' })
  await deleteProductCatchWeight(id, { event })
  return { ok: true }
})
