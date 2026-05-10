/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import {
  updateFreightRule,
  type UpdateFreightRuleInput,
} from '~/modules/freight-rule/server/utils/freight-rule'

/** PUT /api/bo/freight/:id — Partial update of a rule. */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id invalide' })

  const body = await readBody<Record<string, any>>(event)
  const allowed: Array<keyof UpdateFreightRuleInput> = [
    'label', 'scope', 'scopeId', 'thresholdType', 'thresholdValue', 'priority', 'active',
  ]
  const input: UpdateFreightRuleInput = {}
  for (const k of allowed) {
    if (body[k] !== undefined) (input as any)[k] = body[k]
  }
  if (!Object.keys(input).length) return { ok: true }

  await updateFreightRule(id, input, { event })
  return { ok: true }
})
