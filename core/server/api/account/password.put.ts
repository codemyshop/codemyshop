/**
 *
 * PUT /api/account/password
 * Changes the password of the connected user (employee or customer) after
 * verification of `current_password` (defense-in-depth).
 *
 * Remplace l'ancien endpoint PHP /module/ac_base/ajaxupdateprofile?action=change_password
 * (PHP removal phase 1, related migration work).
 */
import { useClientDb } from '~/server/utils/db'
import { getSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const session = getSession(event)
  if (!session) {
    return { success: false, error: 'Non authentifié' }
  }

  const body = await readBody<Record<string, any>>(event)
  const currentPassword = String(body?.current_password || '')
  const newPassword = String(body?.new_password || '')

  if (!currentPassword || !newPassword) {
    return { success: false, error: 'Tous les champs sont requis' }
  }
  if (newPassword.length < 8) {
    return { success: false, error: 'Le mot de passe doit contenir au moins 8 caractères' }
  }

  const db = useClientDb(event)
  const isEmployee = session.userType === 'employee'
  const table = isEmployee ? 'ps_employee' : 'ps_customer'
  const idCol = isEmployee ? 'id_employee' : 'id_customer'
  const where = isEmployee ? '' : ' AND deleted = 0'

  const row = await db.get<any>(
    `SELECT passwd FROM ${table} WHERE ${idCol} = ?${where} LIMIT 1`,
    [session.employeeId],
  )
  if (!row?.passwd) {
    return { success: false, error: 'Compte introuvable' }
  }

  const bcrypt = await import('bcryptjs')
  const stored = String(row.passwd).replace(/^\$2y\$/, '$2a$')
  const ok = await bcrypt.compare(currentPassword, stored)
  if (!ok) {
    return { success: false, error: 'Mot de passe actuel incorrect' }
  }

  const newHash = (await bcrypt.hash(newPassword, 10)).replace(/^\$2a\$/, '$2y$')
  const passwdUpdate = isEmployee
    ? 'passwd = ?, date_upd = NOW()'
    : 'passwd = ?, date_upd = NOW(), last_passwd_gen = NOW()'

  await db.run(
    `UPDATE ${table} SET ${passwdUpdate} WHERE ${idCol} = ?${where}`,
    [newHash, session.employeeId],
  )

  return { success: true }
})
