/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { updateExpiryRule } from '~/enterprise/vertical-food/expiry/server/utils/expiry'

/** PUT /api/bo/expiry/rules/:id — Updates a rule. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  const body = await readBody<{
    label?: string
    minDays?: number
    maxDays?: number
    discountPct?: number
    active?: number
    position?: number
  }>(event)

  if (body.minDays != null && body.maxDays != null && body.minDays > body.maxDays) {
    throw createError({ statusCode: 400, statusMessage: 'minDays ne peut pas être > maxDays' })
  }
  if (body.discountPct != null && (body.discountPct < 0 || body.discountPct > 100)) {
    throw createError({ statusCode: 400, statusMessage: 'discountPct hors bornes [0,100]' })
  }

  await updateExpiryRule(id, body, { event })
  return { ok: true }
})
