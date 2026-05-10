/**
 *
 * POST /api/impersonate/start
 * Starts a B2B impersonation session (commercial mode).
 *
 * ACL: roles `sales`, `commercial`, `founder`, `root` or SuperAdmin SaaS.
 * Body : { idCustomer: number, reason: string }
 * Retour : { ok: true, session: ImpersonationSession }
 *
 * Effets :
 * - Revokes any concurrent active session of the same employee (rotation).
 *  - INSERT cs_impersonation_session (status='active', expires_at=now+2h).
 * - Sets the signed HMAC cookie `hub_impersonation` for front-end banner.
 * - If opening attempt is denied (403) or failure → audit delegated to ACL.
 */
import { sql } from 'drizzle-orm'
import { startSession } from '~/internal/impersonation/server/utils/impersonation'
import { setImpersonationCookie } from '~/internal/impersonation/server/utils/cookie'
import { usePocPg } from '~/server/db/drizzle-pg'
import { requireRoleOrSaas } from '~/server/utils/session'

interface Body { idCustomer?: number; reason?: string }

export default defineEventHandler(async (event) => {
  const session = requireRoleOrSaas(event, ['sales', 'commercial', 'founder', 'root'])

  const body = await readBody<Body>(event)
  const idCustomer = Number(body?.idCustomer || 0)
  const reason = String(body?.reason || '').trim().slice(0, 255)

  if (!idCustomer || idCustomer <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'idCustomer requis' })
  }
  if (!reason) {
    throw createError({ statusCode: 400, statusMessage: 'reason requise (audit RGPD)' })
  }
  if (!session.employeeId) {
    throw createError({ statusCode: 401, statusMessage: 'employee non identifié' })
  }

  // Vérifie que le client cible existe (évite les sessions orphelines).
  const customerExists = await usePocPg().execute<any>(sql`
    SELECT id_customer AS "id", email, firstname, lastname
    FROM cs_main.ps_customer
    WHERE id_customer = ${idCustomer} AND deleted = 0
    LIMIT 1
  `)
  const customer = (customerExists as any[])?.[0]
  if (!customer) {
    throw createError({ statusCode: 404, statusMessage: 'Client introuvable' })
  }

  const ip = String(getRequestHeader(event, 'x-forwarded-for') || getRequestIP(event, { xForwardedFor: true }) || '').slice(0, 64)
  const userAgent = String(getRequestHeader(event, 'user-agent') || '').slice(0, 500)

  const created = await startSession(
    {
      idEmployee: session.employeeId,
      idCustomer,
      ip,
      userAgent,
      reason,
    },
    { event },
  )

  const customerLabel = [customer.firstname, customer.lastname].filter(Boolean).join(' ').trim() || customer.email || `client #${idCustomer}`

  setImpersonationCookie(event, {
    idSession: created.idSession,
    idEmployee: created.idEmployee,
    idCustomer: created.idCustomer,
    customerLabel,
    startedAtIso: created.startedAt,
    expiresAtIso: created.expiresAt,
  })

  return { ok: true, session: created }
})
