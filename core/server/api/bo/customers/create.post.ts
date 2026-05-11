

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ firstname: string; lastname: string; email: string; company?: string; siret?: string; phone?: string }>(event)
  if (!body.firstname?.trim() || !body.lastname?.trim() || !body.email?.trim()) {
    throw createError({ statusCode: 400, message: 'Nom, prénom et email requis' })
  }
  const db = useClientDb(event)

  
  const existing = await db.get<any>(`SELECT id_customer FROM ps_customer WHERE email = ?`, [body.email.trim().toLowerCase()])
  if (existing) throw createError({ statusCode: 409, message: 'Un client avec cet email existe déjà' })

  
  const bcrypt = await import('bcryptjs')
  const passwd = bcrypt.hashSync('TempPass2026!', 12).replace('$2a$', '$2y$')

  const result = await db.run(`
    INSERT INTO ps_customer (id_shop, id_shop_group, id_gender, id_default_group, id_lang, id_risk,
      firstname, lastname, email, passwd, company, siret, active, deleted, newsletter, optin,
      date_add, date_upd, max_payment_days, outstanding_allow_amount)
    VALUES (1, 1, 0, 3, 1, 0, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, NOW(), NOW(), 0, 0)
  `, [body.firstname.trim(), body.lastname.trim(), body.email.trim().toLowerCase(), passwd, body.company?.trim() || '', body.siret?.trim() || ''])

  return { success: true, id: result.insertId }
})
