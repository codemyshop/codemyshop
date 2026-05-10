/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { updateGroup } from '~/enterprise/misc/pricing/server/utils/pricing'

/** PUT /api/bo/pricing/groups/:id — updates a pricing group. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  const body = await readBody<{
    name?: string
    priority?: number
    active?: number
  }>(event)

  await updateGroup(id, body, { event })
  return { ok: true }
})
