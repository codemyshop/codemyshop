

import { verifyToken } from '~/server/utils/session-crypto'

export interface HubSession {
  employeeId: number
  email: string
  firstname: string
  lastname: string
  role: string
  profileId: number
  clientId: string
  userType: 'employee' | 'customer'
  isAdmin: boolean
}

const SUPER_ADMIN_SAAS_EMAILS = new Set<string>([
  'root@codemyshop.com',
  'founder@codemyshop.com',
  
  
  'contact@codemyshop.com',
])

export function getSession(event: any): HubSession | null {
  const data = verifyToken<any>(getCookie(event, 'hub_session'))
  if (!data?.email) return null
  return {
    employeeId: Number(data.employeeId) || 0,
    email: String(data.email || '').toLowerCase(),
    firstname: String(data.firstname || ''),
    lastname: String(data.lastname || ''),
    role: String(data.role || 'employee'),
    profileId: Number(data.profileId) || 0,
    clientId: String(data.clientId || ''),
    userType: (data.userType === 'customer' ? 'customer' : 'employee') as 'employee' | 'customer',
    isAdmin: Boolean(data.isAdmin),
  }
}

export function requireEmployeeSession(event: any): HubSession {
  const session = getSession(event)
  if (!session || session.userType !== 'employee') {
    throw createError({ statusCode: 401, message: 'Authentification employé requise' })
  }
  return session
}

export function isSuperAdminSaaS(session: HubSession | null): boolean {
  if (!session) return false
  return SUPER_ADMIN_SAAS_EMAILS.has(session.email.toLowerCase())
}

export function requireRoleOrSaas(event: any, roles: string[]): HubSession {
  const session = requireEmployeeSession(event)
  if (isSuperAdminSaaS(session)) return session
  const role = (session.role || '').toLowerCase()
  if (roles.map((r) => r.toLowerCase()).includes(role)) return session
  throw createError({ statusCode: 403, message: 'Accès refusé — rôle insuffisant' })
}
