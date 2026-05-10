/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listFreightRulesWithScopeLabel } from '~/modules/freight-rule/server/utils/freight-rule'

/** GET /api/bo/freight — All shipping rules with scope label. */
export default defineEventHandler(async (event) => {
  const rules = await listFreightRulesWithScopeLabel({ event })
  return { ok: true, rules }
})
