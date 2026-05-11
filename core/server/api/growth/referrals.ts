

import { readReferrals, readReferralsByReferrer } from '~/server/utils/referrals'

export default defineEventHandler(async (event) => {
  const { referrerId } = getQuery(event)
  if (referrerId) return await readReferralsByReferrer(String(referrerId), event)
  return await readReferrals(event)
})
