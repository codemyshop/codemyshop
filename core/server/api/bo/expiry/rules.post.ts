/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { createExpiryRule } from '~/enterprise/vertical-food/expiry/server/utils/expiry'

/** POST /api/bo/expiry/rules — Creates an expiry discount rule. */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    label: string
    minDays: number
    maxDays: number
    discountPct: number
    active?: number
    position?: number
  }>(event)

  if (!body?.label || body.minDays == null || body.maxDays == null || body.discountPct == null) {
    throw createError({ statusCode: 400, statusMessage: 'label, minDays, maxDays, discountPct requis' })
  }
  if (body.minDays > body.maxDays) {
    throw createError({ statusCode: 400, statusMessage: 'minDays ne peut pas être > maxDays' })
  }
  if (body.discountPct < 0 || body.discountPct > 100) {
    throw createError({ statusCode: 400, statusMessage: 'discountPct hors bornes [0,100]' })
  }

  await createExpiryRule(
    {
      label: body.label,
      minDays: body.minDays,
      maxDays: body.maxDays,
      discountPct: body.discountPct,
      active: body.active ?? 1,
      position: body.position ?? 0,
    },
    { event },
  )
  return { ok: true }
})
