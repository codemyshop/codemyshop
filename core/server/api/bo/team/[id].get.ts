/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { useClientDb } from '~/server/utils/db'
import { requireEmployeeSession, isSuperAdminSaaS } from '~/server/utils/session'

/**
 * GET /api/bo/team/:id — employee record (Sprint 17).
 *
 * `id=new` returns an empty skeleton for creation. Otherwise read
 * directe ps_employee + join profile_lang.
 *
 * Visibility filter: a non-SaaS admin cannot VIEW a
 * hidden employee (id=1 or SuperAdmin PS profile). 403 if attempted.
 */
export default defineEventHandler(async (event) => {
  const session = requireEmployeeSession(event)
  const isSaas = isSuperAdminSaaS(session)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id requis' })

  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)

  if (id === 'new') {
    return {
      employee: {
        id: 0,
        firstname: '',
        lastname: '',
        email: '',
        active: true,
        profileId: 0,
        profileName: '',
      },
      isNew: true,
      viewerIsSaas: isSaas,
    }
  }

  const db = useClientDb(event)

  const employee = await db.get<any>(`
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
    WHERE e.id_employee = ?
  `, [langId, Number(id)])

  if (!employee) throw createError({ statusCode: 404, message: 'Employé introuvable' })

  if (!isSaas && (employee.id === 1 || Number(employee.profileId) === 1)) {
    throw createError({ statusCode: 403, message: 'Accès refusé à ce compte' })
  }

  return { employee, isNew: false, viewerIsSaas: isSaas }
})
