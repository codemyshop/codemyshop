/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listActiveExpiryRules, listExpiringLots } from '~/enterprise/vertical-food/expiry/server/utils/expiry'

/**
 * GET /api/bo/expiry — Live view of expiry discounts.
 *
 * Retourne :
 * - rules: all active rules (min_days/max_days/discount_pct)
 * - lots: all active batches with expiry within 14 days or less,
 * product price, applicable discount (max discount if multiple
 * rules match), suggested discounted price.
 */
export default defineEventHandler(async (event) => {
  const [rules, lots] = await Promise.all([
    listActiveExpiryRules({ event }),
    listExpiringLots(14, { event }),
  ])
  return { ok: true, rules, lots }
})
