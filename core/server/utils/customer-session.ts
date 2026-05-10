/**
 *
 * Helper to read front-end client session (from `ac_session` cookie).
 * Set by `catalogue/customer/login.post.ts`, consumed by any endpoint
 * that needs to know the current customerId (wishlist, cart, RMA...).
 *
 * Staff impersonation mode: if the logged-in sales staff has
 * a valid `hub_impersonation` token for a target client, `getCustomerSession`
 * returns that client (override). The `isImpersonated` flag allows endpoints
 * critical (checkout/payment) to log `id_session_impersonation` for
 * GDPR traceability.
 */
import type { H3Event } from 'h3'
import { sql } from 'drizzle-orm'
import { verifyToken } from '~/server/utils/session-crypto'
import { resolveImpersonatedCustomer } from '~/internal/impersonation/server/utils/cookie'
import { usePocPg } from '~/server/db/drizzle-pg'

export interface CustomerSession {
  customerId: number
  email: string
  firstname?: string
  lastname?: string
  company?: string
  userType?: 'customer' | 'employee'
  isImpersonated?: boolean
  impersonationSessionId?: number
  impersonatorEmployeeId?: number
}

export function getCustomerSession(event: H3Event): CustomerSession | null {
  const impersonated = resolveImpersonatedCustomer(event)
  if (impersonated && impersonated.idCustomer > 0) {
    return {
      customerId: impersonated.idCustomer,
      email: impersonated.email,
      firstname: '',
      lastname: '',
      company: '',
      userType: 'customer',
      isImpersonated: true,
      impersonationSessionId: impersonated.idSession,
      impersonatorEmployeeId: impersonated.idEmployee,
    }
  }

  const raw = verifyToken<any>(getCookie(event, 'ac_session'))
  if (!raw) return null
  const customerId = Number(raw?.customerId)
  if (!customerId || customerId <= 0) return null
  return {
    customerId,
    email: String(raw.email ?? ''),
    firstname: raw.firstname ?? '',
    lastname: raw.lastname ?? '',
    company: raw.company ?? '',
    userType: raw.userType ?? 'customer',
  }
}

/** Variante stricte qui lance 401 si pas connecté. */
export function requireCustomer(event: H3Event): CustomerSession {
  const session = getCustomerSession(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Connexion requise' })
  }
  return session
}

/**
 * Resolves the customerId to use for a request that accepts one
 * in body/query (cart/create, cart/last, addresses, checkout). If an
 * impersonation is active for the requesting sales staff, their idCustomer
 * target **takes precedence** over the provided value — a sales staff member cannot
 * place an order for a client other than the one for which they opened
 * a session (otherwise GDPR audit bypass).
 *
 * Without impersonation: returns providedId as-is (Number).
 * 0/NaN if nothing usable — the endpoint remains responsible for validation.
 */
export function resolveCustomerIdForRequest(event: H3Event, providedId: any): number {
  const impersonated = resolveImpersonatedCustomer(event)
  if (impersonated && impersonated.idCustomer > 0) return impersonated.idCustomer
  const n = Number(providedId)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Async variant — re-validates in DB the impersonation session (status=active,
 * not expired). To use on sensitive actions: checkout, payment,
 * profile mutations. Throw 403 if cookie present but DB session is stale
 * (revoked, expired, closed). No regression for real clients (skip
 * DB validation if not in impersonation mode).
 */
export async function requireCustomerStrict(event: H3Event): Promise<CustomerSession> {
  const session = requireCustomer(event)
  if (!session.isImpersonated || !session.impersonationSessionId) return session
  const rows = await usePocPg().execute<any>(sql`
    SELECT id_session
    FROM cs_main.cs_impersonation_session
    WHERE id_session = ${session.impersonationSessionId}
      AND status = 'active'
      AND expires_at > NOW()
    LIMIT 1
  `)
  const ok = Array.isArray(rows) && rows.length > 0
  if (!ok) {
    throw createError({ statusCode: 403, message: 'Session commerciale expirée — relancez une session' })
  }
  return session
}
