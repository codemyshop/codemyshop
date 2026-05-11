

import { useClientDb } from '~/server/utils/db'
import { requireEmployeeSession, isSuperAdminSaaS } from '~/server/utils/session'

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
