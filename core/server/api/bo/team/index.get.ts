

import { useClientDb } from '~/server/utils/db'
import { requireEmployeeSession, isSuperAdminSaaS } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const session = requireEmployeeSession(event)
  const isSaas = isSuperAdminSaaS(session)

  const q = getQuery(event) as Record<string, string>
  const page = Math.max(1, Number(q.page || 1))
  const perPage = Math.min(10000, Math.max(1, Number(q.perPage || 100)))
  const search = (q.search || '').trim()
  const langId = Math.max(1, Number(q.lang) || 1)
  const db = useClientDb(event)

  const conditions: string[] = []
  const params: any[] = []

  if (!isSaas) {
    conditions.push(`e.id_employee <> 1`)
    conditions.push(`e.id_profile <> 1`)
  }

  if (search) {
    conditions.push(`(e.firstname LIKE ? OR e.lastname LIKE ? OR e.email LIKE ?)`)
    const s = `%${search}%`
    params.push(s, s, s)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const countRow = await db.get<any>(`SELECT COUNT(*) AS total FROM ps_employee e ${where}`, params)
    const total = countRow?.total ?? 0
    const offset = (page - 1) * perPage

    const employees = await db.query<any>(`
      SELECT
        e.id_employee AS id,
        e.firstname,
        e.lastname,
        e.email,
        e.active,
        e.id_profile AS profileId,
        COALESCE(pl.name, '') AS profileName,
        e.last_connection_date AS lastConnection,
        e.optin
      FROM ps_employee e
      LEFT JOIN ps_profile_lang pl ON pl.id_profile = e.id_profile AND pl.id_lang = ?
      ${where}
      ORDER BY e.id_employee ASC
      LIMIT ? OFFSET ?
    `, [langId, ...params, perPage, offset])

    return {
      employees,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
      viewerIsSaas: isSaas,
    }
  } catch (err: any) {
    console.error('[bo/team] DB error:', err?.message)
    return { employees: [], total: 0, page, perPage, totalPages: 0, viewerIsSaas: isSaas }
  }
})
