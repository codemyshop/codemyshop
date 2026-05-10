/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { requireEmployeeSession, isSuperAdminSaaS } from '~/server/utils/session'

/**
 * GET /api/bo/team/profiles — list of available profiles for the
 * employee editor dropdown (Sprint 17).
 *
 * Visibility: same rule as /api/bo/team — a tenant admin should not
 * be able to ASSIGN the native PS SuperAdmin profile (id 1)
 * to one of their employees, otherwise they would self-escalate privilege.
 */
export default defineEventHandler(async (event) => {
  const session = requireEmployeeSession(event)
  const isSaas = isSuperAdminSaaS(session)

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const db = useClientDb(event)

  const where = isSaas ? '' : 'WHERE p.id_profile <> 1'

  const profiles = await db.query<any>(`
    SELECT
      p.id_profile AS id,
      COALESCE(pl.name, CONCAT('Profil #', p.id_profile)) AS name
    FROM ps_profile p
    LEFT JOIN ps_profile_lang pl ON pl.id_profile = p.id_profile AND pl.id_lang = ?
    ${where}
    ORDER BY p.id_profile ASC
  `, [langId])

  return { profiles, viewerIsSaas: isSaas }
})
