/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { deleteExpiryRule } from '~/enterprise/vertical-food/expiry/server/utils/expiry'

/** DELETE /api/bo/expiry/rules/:id — Deletes a rule. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  await deleteExpiryRule(id, { event })
  return { ok: true }
})
