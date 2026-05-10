/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * GET /api/catalogue/customer/me — Verifies the customer session.
 *
 * Cookie: ac_session (HMAC-signed).
 * Admin/seller mode: if the logged-in admin has a hub_impersonation cookie
 * valid, we return the target customer profile (enriched from ps_customer)
 * with an isImpersonated flag. The storefront then displays 'as customer'.
 */
import { sql } from 'drizzle-orm'
import { getCustomerSession } from '~/server/utils/customer-session'
import { usePocPg } from '~/server/db/drizzle-pg'

export default defineEventHandler(async (event) => {
  const session = getCustomerSession(event)
  if (!session?.customerId) return { loggedIn: false }

  if (session.isImpersonated) {
    const rows = await usePocPg().execute<any>(sql`
      SELECT id_customer, email, firstname, lastname, company
      FROM cs_main.ps_customer
      WHERE id_customer = ${session.customerId} AND deleted = 0
      LIMIT 1
    `)
    const c = (rows as any[])?.[0]
    if (!c) return { loggedIn: false }
    return {
      loggedIn: true,
      customerId: Number(c.id_customer),
      email: String(c.email || ''),
      firstname: String(c.firstname || ''),
      lastname: String(c.lastname || ''),
      company: String(c.company || ''),
      userType: 'customer',
      isAdmin: false,
      isImpersonated: true,
      impersonationSessionId: session.impersonationSessionId,
      impersonatorEmployeeId: session.impersonatorEmployeeId,
    }
  }

  return {
    loggedIn: true,
    customerId: session.customerId,
    email: session.email,
    firstname: session.firstname || '',
    lastname: session.lastname || '',
    company: session.company || '',
    userType: session.userType || 'customer',
  }
})
