

import { requireEmployeeSession, isSuperAdminSaaS } from '~/server/utils/session'
import {
  countEmployeeOrders,
  deleteEmployeeExtra,
  getEmployeeBaseInfo,
  hardDeleteEmployee,
  softDeactivateEmployee,
} from '~/internal/employeeextra/server/utils/employeeextra'

export default defineEventHandler(async (event) => {
  const session = requireEmployeeSession(event)
  const isSaas = isSuperAdminSaaS(session)

  const rawId = getRouterParam(event, 'id')
  const id = Number(rawId)
  if (!id || id < 1) {
    throw createError({ statusCode: 400, message: 'id invalide' })
  }

  if (id === session.employeeId) {
    throw createError({ statusCode: 403, message: 'Auto-suppression interdite' })
  }

  const employee = await getEmployeeBaseInfo(id, { event })
  if (!employee) throw createError({ statusCode: 404, message: 'Employé introuvable' })

  if (!isSaas && (Number(employee.id_employee) === 1 || Number(employee.id_profile) === 1)) {
    throw createError({ statusCode: 403, message: 'Suppression refusée sur ce compte' })
  }

  let blockingCount = 0
  try {
    blockingCount = await countEmployeeOrders(id, { event })
  } catch {  }

  if (blockingCount > 0) {
    await softDeactivateEmployee(id, { event })
    try { await deleteEmployeeExtra(id, { event }) } catch {}
    return {
      success: true,
      mode: 'soft',
      message: `Employé désactivé (${blockingCount} commande(s) liée(s) — hard delete impossible)`,
    }
  }

  try { await deleteEmployeeExtra(id, { event }) } catch {}
  await hardDeleteEmployee(id, { event })

  return { success: true, mode: 'hard', message: 'Employé supprimé définitivement' }
})
