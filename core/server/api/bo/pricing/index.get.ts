

import { listGroups, listTiers, listContracts } from '~/enterprise/misc/pricing/server/utils/pricing'

export default defineEventHandler(async (event) => {
  const [groups, tiers, contracts] = await Promise.all([
    listGroups({ event }),
    listTiers({ event }),
    listContracts({ event }),
  ])
  return { ok: true, groups, tiers, contracts }
})
