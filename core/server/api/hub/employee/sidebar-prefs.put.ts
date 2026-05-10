/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * PUT /api/hub/employee/sidebar-prefs
 *
 * Body : { hidden?: string[], order?: Record<string, string[]>, collapsed?: boolean }
 *
 * Upsert the sidebar preferences for the current employee. The 3 fields
 * are independent: we only write those provided in the body
 * (COALESCE on the PG side to preserve the others).
 */

import { useClientDb } from '~/server/utils/db'
import { requireEmployeeSession } from '~/server/utils/session'

interface Body {
  hidden?: string[]
  order?: Record<string, string[]>
  collapsed?: boolean
}

function sanitizeHidden(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null
  const out: string[] = []
  for (const v of input) {
    if (typeof v !== 'string') continue
    const s = v.trim()
    if (s && s.length <= 512) out.push(s)
  }
  return out
}

function sanitizeOrder(input: unknown): Record<string, string[]> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const out: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(input)) {
    const key = String(k).trim().toLowerCase()
    if (!key || key.length > 64) continue
    if (!Array.isArray(v)) continue
    const arr: string[] = []
    for (const href of v) {
      if (typeof href !== 'string') continue
      const s = href.trim()
      if (s && s.length <= 512) arr.push(s)
    }
    out[key] = arr
  }
  return out
}

export default defineEventHandler(async (event) => {
  const session = requireEmployeeSession(event)
  const body = await readBody<Body>(event)

  const hidden = body?.hidden !== undefined ? sanitizeHidden(body.hidden) : undefined
  const order = body?.order !== undefined ? sanitizeOrder(body.order) : undefined
  const collapsed = body?.collapsed !== undefined ? (body.collapsed ? 1 : 0) : undefined

  if (body?.hidden !== undefined && hidden === null) {
    throw createError({ statusCode: 400, message: 'hidden doit être un string[]' })
  }
  if (body?.order !== undefined && order === null) {
    throw createError({ statusCode: 400, message: 'order doit être un Record<string, string[]>' })
  }

  const db = useClientDb(event)

  // Étape 1 : garantit qu'une row existe avec les defaults (NOT NULL respectés
  // côté DDL : hidden_items='[]', section_order='{}', collapsed=0).
  await db.run(
    `INSERT INTO cs_employee_sidebar_pref (id_employee)
     VALUES (?)
     ON CONFLICT (id_employee) DO NOTHING`,
    [session.employeeId],
  )

  // Étape 2 : UPDATE partiel — COALESCE garde la valeur existante quand le
  // body ne fournit pas le champ (NULL passé en param).
  await db.run(
    `UPDATE cs_employee_sidebar_pref
        SET hidden_items  = COALESCE(?::jsonb, hidden_items),
            section_order = COALESCE(?::jsonb, section_order),
            collapsed     = COALESCE(?,        collapsed),
            date_upd      = NOW()
      WHERE id_employee = ?`,
    [
      hidden !== undefined ? JSON.stringify(hidden) : null,
      order !== undefined ? JSON.stringify(order) : null,
      collapsed !== undefined ? collapsed : null,
      session.employeeId,
    ],
  )

  return { ok: true }
})
