/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/hub/employee/sidebar-prefs
 *
 * Load the current employee's sidebar preferences. 1 row per
 * id_employee in cs_employee_sidebar_pref. If the row doesn't exist
 * yet, we return the defaults (first login = sidebar by default).
 *
 * Renvoie : { hidden: string[], order: Record<string, string[]>, collapsed: boolean }
 */

import { useClientDb } from '~/server/utils/db'
import { requireEmployeeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const session = requireEmployeeSession(event)
  const db = useClientDb(event)

  const row = await db.get<{
    hidden_items: unknown
    section_order: unknown
    collapsed: number
  }>(
    `SELECT hidden_items, section_order, collapsed
       FROM cs_employee_sidebar_pref
      WHERE id_employee = ?`,
    [session.employeeId],
  ).catch(() => null)

  if (!row) {
    return { hidden: [], order: {}, collapsed: false }
  }

  // postgres-js décode jsonb directement en JS — pas de JSON.parse à faire.
  const hidden = Array.isArray(row.hidden_items) ? (row.hidden_items as string[]) : []
  const order = (row.section_order && typeof row.section_order === 'object')
    ? (row.section_order as Record<string, string[]>)
    : {}

  return {
    hidden,
    order,
    collapsed: Number(row.collapsed) === 1,
  }
})
