/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { deleteTier } from '~/enterprise/misc/pricing/server/utils/pricing'

/** DELETE /api/bo/pricing/tiers/:id — deletes a tier. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  await deleteTier(id, { event })
  return { ok: true }
})
