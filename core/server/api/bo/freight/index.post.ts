/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import {
  createFreightRule,
  FREIGHT_SCOPES,
  FREIGHT_THRESHOLDS,
  type FreightScope,
  type FreightThresholdType,
} from '~/modules/freight-rule/server/utils/freight-rule'

/** POST /api/bo/freight — Creates a shipping rule. */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    label: string
    scope?: string
    scopeId?: number
    thresholdType?: string
    thresholdValue: number
    priority?: number
    active?: number
  }>(event)

  if (!body?.label) throw createError({ statusCode: 400, statusMessage: 'label requis' })
  if (body.thresholdValue == null || body.thresholdValue < 0) {
    throw createError({ statusCode: 400, statusMessage: 'thresholdValue ≥ 0 requis' })
  }
  const scope = (body.scope || 'all') as FreightScope
  const thresholdType = (body.thresholdType || 'amount_ht') as FreightThresholdType
  if (!FREIGHT_SCOPES.includes(scope)) throw createError({ statusCode: 400, statusMessage: `scope ∈ ${FREIGHT_SCOPES.join('|')}` })
  if (!FREIGHT_THRESHOLDS.includes(thresholdType)) throw createError({ statusCode: 400, statusMessage: `thresholdType ∈ ${FREIGHT_THRESHOLDS.join('|')}` })

  await createFreightRule(
    {
      label: body.label,
      scope,
      scopeId: body.scopeId ?? 0,
      thresholdType,
      thresholdValue: body.thresholdValue,
      priority: body.priority ?? 0,
      active: body.active ?? 1,
    },
    { event },
  )
  return { ok: true }
})
