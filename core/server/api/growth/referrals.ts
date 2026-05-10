/**
 *
 * GET /api/growth/referrals?referrerId=example-shop
 *
 * Phase 9b.4c: Direct Drizzle on cs_referral_invite.
 */

import { readReferrals, readReferralsByReferrer } from '~/server/utils/referrals'

export default defineEventHandler(async (event) => {
  const { referrerId } = getQuery(event)
  if (referrerId) return await readReferralsByReferrer(String(referrerId), event)
  return await readReferrals(event)
})
