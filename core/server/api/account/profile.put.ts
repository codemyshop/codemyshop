

import { useClientDb } from '~/server/utils/db'
import { getSession } from '~/server/utils/session'
import { signToken } from '~/server/utils/session-crypto'

export default defineEventHandler(async (event) => {
  const session = getSession(event)
  if (!session) {
    return { success: false, error: 'Non authentifié' }
  }

  const body = await readBody<Record<string, any>>(event)
  const firstname = String(body?.firstname || '').trim()
  const lastname = String(body?.lastname || '').trim()
  const email = String(body?.email || '').trim().toLowerCase()

  if (!firstname || !lastname || !email) {
    return { success: false, error: 'Tous les champs sont requis' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Email invalide' }
  }

  const db = useClientDb(event)
  const userId = session.employeeId
  const isEmployee = session.userType === 'employee'
  const table = isEmployee ? 'ps_employee' : 'ps_customer'
  const idCol = isEmployee ? 'id_employee' : 'id_customer'
  const where = isEmployee ? '' : ' AND deleted = 0'

  const dup = await db.get<any>(
    `SELECT ${idCol} AS uid FROM ${table} WHERE email = ? AND ${idCol} != ?${where} LIMIT 1`,
    [email, userId],
  )
  if (dup) {
    return { success: false, error: 'Cet email est déjà utilisé' }
  }

  await db.run(
    `UPDATE ${table} SET firstname = ?, lastname = ?, email = ?, date_upd = NOW()
      WHERE ${idCol} = ?${where}`,
    [firstname, lastname, email, userId],
  )

  if (email !== session.email) {
    const newToken = signToken({
      employeeId: session.employeeId,
      email,
      firstname,
      lastname,
      role: session.role,
      profileId: session.profileId,
      clientId: session.clientId,
      userType: session.userType,
      isAdmin: session.isAdmin,
    })
    setCookie(event, 'hub_session', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
  }

  return { success: true }
})
