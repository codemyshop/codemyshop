

import { resolveFreightRule } from '~/modules/freight-rule/server/utils/freight-rule'

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
