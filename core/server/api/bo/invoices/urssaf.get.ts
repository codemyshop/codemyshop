/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { listUrssafDeclarations } from '~/enterprise/banking/urssaf/server/utils/urssaf'

/**
 * GET /api/bo/invoices/urssaf — monthly URSSAF declarations with paid/filed status.
 *
 * Query: ?months=12 (default)
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const months = Math.min(36, Math.max(1, Number(q.months || 12)))

  try {
    const declarations = await listUrssafDeclarations(months, { event })
    return { declarations }
  } catch (err: any) {
    console.error('[bo/invoices/urssaf] DB error:', err?.message)
    return { declarations: [] }
  }
})
