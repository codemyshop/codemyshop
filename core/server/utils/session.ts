/**
 *
 * Server-side Hub session reading (Sprint 17).
 *
 * The `hub_session` cookie is a base64url-encoded JSON payload signed with HMAC-SHA256
 * (see core/server/utils/session-crypto.ts) in login.post.ts. It
 * contient : employeeId, email, profileId, firstname, lastname, role,
 * clientId, userType, isAdmin.
 *
 * This module does NOT issue new sessions — it only verifies
 * the signature and decode for endpoints that need to know
 * the requester's identity (employee governance, visibility filters,
 * etc.). Cookie without a signature or invalid signature → null (re-login
 * requis), cf. backlog #249 P0 debt_archi 2026-04-29.
 */
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

/**
 * Emails that grant "SuperAdmin SaaS" rights — above
 * any platform role and any tenant. These accounts see the entirety
 * of the employees, including technical accounts (id_employee = 1,
 * profils SuperAdmin natifs PS, comptes modules).
 *
 * Intentionally kept short and static — no DB, no toggle.
 * Modifying this list = code change + review.
 */
const SUPER_ADMIN_SAAS_EMAILS = new Set<string>([
  'root@codemyshop.com',
  'founder@codemyshop.com',
  // Compte historique ac-hub : le seul employee réel en DB actuellement.
  // À retirer quand les comptes root@/founder@ seront provisionnés en prod.
  'contact@codemyshop.com',
])

/**
 * Decode the `hub_session` cookie. Return null if absent/invalid —
 * no exception to let public endpoints continue.
 */
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

/**
 * Return the session if it's an authenticated employee, otherwise throw 401.
 * Use in /api/bo/* endpoints that are never public.
 */
export function requireEmployeeSession(event: any): HubSession {
  const session = getSession(event)
  if (!session || session.userType !== 'employee') {
    throw createError({ statusCode: 401, message: 'Authentification employé requise' })
  }
  return session
}

/**
 * True if the requester has SuperAdmin SaaS rights (above
 * the tenant, full team visibility).
 */
export function isSuperAdminSaaS(session: HubSession | null): boolean {
  if (!session) return false
  return SUPER_ADMIN_SAAS_EMAILS.has(session.email.toLowerCase())
}

/**
 * Require one of the provided roles OR SuperAdmin SaaS level.
 * Sprint 18 — gate /api/bo/marketing/pages (Marketing + SaaS).
 *
 * The provided roles are compared in lowercase against `session.role`
 * (freeform string as injected by login.post.ts). SuperAdmin SaaS
 * is always authorized, even if its platform role doesn't match.
 */
export function requireRoleOrSaas(event: any, roles: string[]): HubSession {
  const session = requireEmployeeSession(event)
  if (isSuperAdminSaaS(session)) return session
  const role = (session.role || '').toLowerCase()
  if (roles.map((r) => r.toLowerCase()).includes(role)) return session
  throw createError({ statusCode: 403, message: 'Accès refusé — rôle insuffisant' })
}
