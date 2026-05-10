/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { requireEmployeeSession, isSuperAdminSaaS } from '~/server/utils/session'
import { loadProfileSectionsMap } from '~/modules/profile-section/server/utils/profile-section'

/**
 * GET /api/bo/team/profile-sections
 *
 * Returns the complete permissions matrix profile × section:
 *   { profiles: [{ id, name }], sections: ['dashboard', ...],
 *     map: { [id_profile]: ['dashboard', 'orders', ...] } }
 *
 * Used by useRoles.ts (dynamic canAccess) and by the page
 * /hub/team/profiles (UI matrice).
 */

const ALL_SECTIONS = [
  'dashboard',
  'orders',
  'crm',
  'crm_sav',
  'catalogue',
  'intelligence',
  'automatisations',
  'logistique',
  'growth',
  'playbooks',
  'playbooks_edit',
  'admin',
  'system',
  'founder_admin',
] as const

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

  const sectionsMap = await loadProfileSectionsMap({ event })
  const map: Record<number, string[]> = {}
  if (sectionsMap) {
    for (const [pid, sections] of sectionsMap) {
      if (!isSaas && pid === 1) continue
      map[pid] = sections
    }
  } else {
    console.warn('[profile-sections] table missing, fallback empty map')
  }

  return {
    profiles,
    sections: ALL_SECTIONS,
    map,
    viewerIsSaas: isSaas,
  }
})
