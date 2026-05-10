/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listGroups, listTiers, listContracts } from '~/enterprise/misc/pricing/server/utils/pricing'

/**
 * GET /api/bo/pricing — Vue d'ensemble grilles B2B.
 *
 * Retourne :
 * - groups    : all pricing groups (priority, status)
 * - tiers     : all tiers (id_group × id_product × min_quantity)
 * - contracts : active individually negotiated contracts
 */
export default defineEventHandler(async (event) => {
  const [groups, tiers, contracts] = await Promise.all([
    listGroups({ event }),
    listTiers({ event }),
    listContracts({ event }),
  ])
  return { ok: true, groups, tiers, contracts }
})
