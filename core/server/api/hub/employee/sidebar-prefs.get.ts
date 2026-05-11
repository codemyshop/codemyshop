

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
