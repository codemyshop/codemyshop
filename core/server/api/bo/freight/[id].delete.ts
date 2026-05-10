/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { deleteFreightRule } from '~/modules/freight-rule/server/utils/freight-rule'

/** DELETE /api/bo/freight/:id — Deletes a shipping rule. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  await deleteFreightRule(id, { event })
  return { ok: true }
})
