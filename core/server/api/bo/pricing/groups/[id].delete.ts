/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { deleteGroup } from '~/enterprise/misc/pricing/server/utils/pricing'

/** DELETE /api/bo/pricing/groups/:id — deletes a group (and its tiers by logical CASCADE). */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  await deleteGroup(id, { event })
  return { ok: true }
})
