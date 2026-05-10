/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { resolveFreightRule } from '~/modules/freight-rule/server/utils/freight-rule'

/**
 * GET /api/bo/freight/resolve?amount=X&weight=Y&pallets=Z&group=G&carrier=C&zone=Z
 *
 * Evaluates all active rules and returns the winning rule (priority
 * highest among eligible ones) or null if none.
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const result = await resolveFreightRule(
    {
      amount: Number(q.amount ?? 0),
      weight: Number(q.weight ?? 0),
      pallets: Number(q.pallets ?? 0),
      group: Number(q.group ?? 0),
      carrier: Number(q.carrier ?? 0),
      zone: Number(q.zone ?? 0),
    },
    { event },
  )
  return { ok: true, ...result }
})
