

import { createHash } from 'node:crypto'
import { useClientDb } from '~/server/utils/db'
import { getTenantPsConfig } from '~/server/utils/ps-tenant'
import { signToken } from '~/server/utils/session-crypto'

interface CustomerRow {
  id_customer: number
  email: string
  firstname: string
  lastname: string
  company: string
  passwd: string
  active: number
}

interface EmployeeRow {
  id_employee: number
  email: string
  firstname: string
  lastname: string
  passwd: string
  active: number
  id_profile: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string; password?: string }>(event).catch(() => null)

  if (!body || !body.email || !body.password) {
    throw createError({ statusCode: 422, message: 'Email et mot de passe requis' })
  }

  const tenant = getTenantPsConfig(event)
  const db = useClientDb(event)

  
  async function verifyPassword(plain: string, storedHash: string): Promise<boolean> {
    if (!storedHash) return false
    if (storedHash.startsWith('$2y$') || storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
      try {
        const bcrypt = await import('bcryptjs')
        return await bcrypt.compare(plain, storedHash.replace(/^\$2y\$/, '$2a$'))
      } catch {
        return false
      }
    }
    return createHash('md5').update(tenant.cookieKey + plain).digest('hex') === storedHash
  }

  function setSessionCookie(payload: object) {
    const token = signToken(payload)
    const maxAge = 60 * 60 * 24 * 30
    setCookie(event, 'ac_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge,
    })
  }

  
  const customer = await db.get<CustomerRow>(
    `SELECT id_customer, email, firstname, lastname, IFNULL(company, '') AS company,
            passwd, active
       FROM ps_customer
      WHERE email = ? AND deleted = 0
      LIMIT 1`,
    [body.email],
  )

  if (customer && await verifyPassword(body.password, customer.passwd)) {
    if (Number(customer.active) !== 1) {
      throw createError({ statusCode: 403, message: 'Compte désactivé. Contactez-nous.' })
    }
    const session = {
      customerId: customer.id_customer,
      email: customer.email,
      firstname: customer.firstname,
      lastname: customer.lastname,
      company: customer.company,
      userType: 'customer' as const,
    }
    setSessionCookie(session)
    return { success: true, customer: session }
  }

  
  const emp = await db.get<EmployeeRow>(
    `SELECT id_employee, email, firstname, lastname, passwd, active, id_profile
       FROM ps_employee
      WHERE email = ?
      LIMIT 1`,
    [body.email],
  )

  if (emp && await verifyPassword(body.password, emp.passwd) && Number(emp.active) === 1) {
    const session = {
      customerId: emp.id_employee,
      email: emp.email,
      firstname: emp.firstname,
      lastname: emp.lastname,
      company: '',
      userType: 'employee' as const,
      profileId: emp.id_profile,
      isAdmin: emp.id_profile === 1,
    }
    setSessionCookie(session)
    if (session.isAdmin) {
      const hubPayload = {
        employeeId: session.customerId,
        email: session.email,
        firstname: session.firstname,
        lastname: session.lastname,
        role: session.profileId === 1 ? 'owner' : 'developer',
        profileId: session.profileId,
        clientId: tenant.clientId,
        userType: 'employee',
        isAdmin: true,
      }
      const hubToken = signToken(hubPayload)
      setCookie(event, 'hub_session', hubToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
    }
    return { success: true, customer: session, isAdmin: session.isAdmin }
  }

  throw createError({ statusCode: 401, message: 'Email ou mot de passe incorrect.' })
})
