

import { useClientDb } from '~/server/utils/db'
import { requireEmployeeSession, isSuperAdminSaaS } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const session = requireEmployeeSession(event)
  const isSaas = isSuperAdminSaaS(session)

  const rawId = getRouterParam(event, 'id')
  if (!rawId) throw createError({ statusCode: 400, message: 'id requis' })

  const body = await readBody<{
    firstname?: string
    lastname?: string
    email?: string
    password?: string
    profileId?: number
    active?: boolean
  }>(event)

  const db = useClientDb(event)
  const isNew = rawId === 'new' || Number(rawId) === 0

  const firstname = String(body.firstname || '').trim()
  const lastname = String(body.lastname || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const profileId = Number(body.profileId) || 0
  const active = body.active === false ? 0 : 1

  
  if (!isSaas && profileId === 1) {
    throw createError({ statusCode: 403, message: 'Assignation du profil SuperAdmin interdite' })
  }

  
  if (isNew) {
    if (!firstname || !lastname || !email || !profileId || !password) {
      throw createError({
        statusCode: 422,
        message: 'Prénom, nom, email, profil et mot de passe obligatoires à la création',
      })
    }
    if (password.length < 8) {
      throw createError({ statusCode: 422, message: 'Mot de passe trop court (min 8)' })
    }

    const existing = await db.get<any>(`SELECT id_employee FROM ps_employee WHERE email = ?`, [email])
    if (existing) {
      throw createError({ statusCode: 409, message: 'Un employé avec cet email existe déjà' })
    }

    const hash = await hashPassword(password)

    const insert = await db.run(`
      INSERT INTO ps_employee
        (id_profile, id_lang, lastname, firstname, email, passwd,
         last_passwd_gen, stats_compare_option, default_tab, bo_width,
         bo_menu, active, id_last_order, id_last_customer_message,
         id_last_customer, has_enabled_gravatar)
      VALUES (?, 1, ?, ?, ?, ?, NOW(), 1, 0, 0, 1, ?, 0, 0, 0, 0)
    `, [profileId, lastname, firstname, email, hash, active])

    return { success: true, id: insert.insertId, created: true }
  }

  
  const id = Number(rawId)
  const existing = await db.get<any>(`
    SELECT id_employee, id_profile, email FROM ps_employee WHERE id_employee = ?
  `, [id])
  if (!existing) throw createError({ statusCode: 404, message: 'Employé introuvable' })

  
  if (!isSaas && (existing.id_employee === 1 || Number(existing.id_profile) === 1)) {
    throw createError({ statusCode: 403, message: 'Modification refusée sur ce compte' })
  }

  
  if (email && email !== String(existing.email || '').toLowerCase()) {
    const clash = await db.get<any>(`
      SELECT id_employee FROM ps_employee WHERE email = ? AND id_employee <> ?
    `, [email, id])
    if (clash) {
      throw createError({ statusCode: 409, message: 'Email déjà utilisé par un autre employé' })
    }
  }

  const fields: string[] = []
  const params: any[] = []
  if (body.firstname !== undefined) { fields.push('firstname = ?'); params.push(firstname) }
  if (body.lastname !== undefined) { fields.push('lastname = ?'); params.push(lastname) }
  if (body.email !== undefined) { fields.push('email = ?'); params.push(email) }
  if (body.active !== undefined) { fields.push('active = ?'); params.push(active) }
  if (body.profileId !== undefined && profileId > 0) { fields.push('id_profile = ?'); params.push(profileId) }

  if (password) {
    if (password.length < 8) {
      throw createError({ statusCode: 422, message: 'Mot de passe trop court (min 8)' })
    }
    const hash = await hashPassword(password)
    fields.push('passwd = ?')
    params.push(hash)
    fields.push('last_passwd_gen = NOW()')
  }

  if (!fields.length) {
    return { success: true, id, created: false, noop: true }
  }

  await db.run(
    `UPDATE ps_employee SET ${fields.join(', ')} WHERE id_employee = ?`,
    [...params, id]
  )

  return { success: true, id, created: false, passwordReset: !!password }
})

async function hashPassword(plain: string): Promise<string> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.hash(plain, 10)
}
