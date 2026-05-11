

import {
  listSessions,
  type ImpersonationStatus,
} from '~/internal/impersonation/server/utils/impersonation'
import {
  isSuperAdminSaaS,
  requireRoleOrSaas,
} from '~/server/utils/session'

const ALLOWED_STATUS: ImpersonationStatus[] = ['active', 'closed', 'expired', 'revoked']

export default defineEventHandler(async (event) => {
  const session = requireRoleOrSaas(event, ['sales', 'commercial', 'founder', 'root'])
  const isPriv = isSuperAdminSaaS(session) || ['root', 'founder'].includes((session.role || '').toLowerCase())

  const q = getQuery(event)
  const idCustomer = q.idCustomer ? Number(q.idCustomer) : undefined
  const idEmployeeQ = q.idEmployee ? Number(q.idEmployee) : undefined
  const statusRaw = String(q.status || '').toLowerCase()
  const status = ALLOWED_STATUS.includes(statusRaw as ImpersonationStatus)
    ? (statusRaw as ImpersonationStatus)
    : undefined
  const limit = q.limit ? Number(q.limit) : undefined

  
  const idEmployee = isPriv ? idEmployeeQ : session.employeeId

  const rows = await listSessions(
    { idEmployee, idCustomer, status, limit },
    { event },
  )

  return { sessions: rows, scope: isPriv ? 'global' : 'self' }
})
