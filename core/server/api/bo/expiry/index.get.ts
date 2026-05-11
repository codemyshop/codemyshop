

import { listActiveExpiryRules, listExpiringLots } from '~/enterprise/vertical-food/expiry/server/utils/expiry'

export default defineEventHandler(async (event) => {
  const [rules, lots] = await Promise.all([
    listActiveExpiryRules({ event }),
    listExpiringLots(14, { event }),
  ])
  return { ok: true, rules, lots }
})
