

import { listFreightRulesWithScopeLabel } from '~/modules/freight-rule/server/utils/freight-rule'

export default defineEventHandler(async (event) => {
  const rules = await listFreightRulesWithScopeLabel({ event })
  return { ok: true, rules }
})
