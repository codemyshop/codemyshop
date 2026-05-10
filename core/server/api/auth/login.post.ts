/**
 *
 * POST /api/auth/login
 * Body : { email, password }
 *
 * Authentification duale AC Hub :
 * 1. Look in ps_employee (admin/hub access)
 * 2. Otherwise in ps_customer (client access)
 *
 * Bcrypt verification for both (PS 8+). Direct DB (doctrine
 * "Zero PrestaShop webservice" 2026-04-22). Creates a hub_session cookie.
 */
import { useClientDb } from '~/server/utils/db'
import { getFrontRole, isProfileAdmin } from '~/server/utils/roles'
import { signToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string; password: string }>(event)

  const email = (body.email ?? '').trim().toLowerCase().slice(0, 255)
  const password = (body.password ?? '').slice(0, 200)

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email et mot de passe requis' })
  }

  const db = useClientDb(event)

  // ── 1. Employee (admin/hub) ──────────────────────────────────────────────
  try {
    const emp = await db.get<any>(
      `SELECT id_employee, email, firstname, lastname, passwd, active, id_profile
         FROM ps_employee
        WHERE email = ?
        LIMIT 1`,
      [email],
    )
    if (emp && Number(emp.active) === 1) {
      const isValid = await verifyBcrypt(password, String(emp.passwd || ''))
      if (isValid) {
        const profileId = Number(emp.id_profile)
        const role = getFrontRole(profileId)
        return createSession(event, {
          employeeId: Number(emp.id_employee),
          email: String(emp.email),
          firstname: String(emp.firstname || ''),
          lastname: String(emp.lastname || ''),
          role,
          profileId,
          clientId: 'ac-hub',
          userType: 'employee',
          isAdmin: isProfileAdmin(profileId),
        })
      }
      return { success: false, error: 'Identifiants incorrects' }
    }
  } catch (err: any) {
    console.warn('[auth/login] Employee lookup failed:', err?.message)
  }

  // ── 2. Customer (client) ─────────────────────────────────────────────────
  try {
    const cust = await db.get<any>(
      `SELECT id_customer, email, firstname, lastname, passwd, active
         FROM ps_customer
        WHERE email = ? AND deleted = 0
        LIMIT 1`,
      [email],
    )
    if (cust) {
      if (Number(cust.active) !== 1) return { success: false, error: 'Compte désactivé' }
      const isValid = await verifyBcrypt(password, String(cust.passwd || ''))
      if (isValid) {
        return createSession(event, {
          employeeId: Number(cust.id_customer),
          email: String(cust.email),
          firstname: String(cust.firstname || ''),
          lastname: String(cust.lastname || ''),
          role: 'customer',
          profileId: 0,
          clientId: 'ac-hub',
          userType: 'customer',
          isAdmin: false,
        })
      }
    }
  } catch (err: any) {
    console.error('[auth/login] Customer lookup error:', err?.message)
  }

  return { success: false, error: 'Identifiants incorrects' }
})

// ── Helpers ────────────────────────────────────────────────────────────────

async function verifyBcrypt(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false
  if (hash.startsWith('$2y$') || hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    try {
      const bcrypt = await import('bcryptjs')
      return await bcrypt.compare(plain, hash.replace(/^\$2y\$/, '$2a$'))
    } catch { return false }
  }
  return false
}

interface SessionPayload {
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

function createSession(event: any, data: SessionPayload) {
  const token = signToken(data)
  setCookie(event, 'hub_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  return {
    success: true,
    employee: {
      id: data.employeeId,
      email: data.email,
      firstname: data.firstname,
      lastname: data.lastname,
      role: data.role,
      profileId: data.profileId,
      is_admin: data.isAdmin,
      user_type: data.userType,
    },
  }
}
