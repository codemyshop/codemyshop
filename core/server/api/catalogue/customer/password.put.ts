

import { useClientDb } from '~/server/utils/db'
import { requireCustomer } from '~/server/utils/customer-session'

export default defineEventHandler(async (event) => {
  const session = requireCustomer(event)
  const body = await readBody<{ newPassword?: string }>(event)
  const newPassword = String(body?.newPassword || '')

  if (newPassword.length < 8) {
    throw createError({ statusCode: 422, message: 'Le nouveau mot de passe doit faire au moins 8 caractères' })
  }

  const bcrypt = await import('bcryptjs')
  const hashed = (await bcrypt.hash(newPassword, 10)).replace(/^\$2a\$/, '$2y$')

  const db = useClientDb(event)
  const { affectedRows } = await db.run(
    `UPDATE ps_customer SET passwd = ?, date_upd = NOW(), last_passwd_gen = NOW()
      WHERE id_customer = ? AND deleted = 0`,
    [hashed, session.customerId],
  )
  if (!affectedRows) throw createError({ statusCode: 404, message: 'Client introuvable' })

  return { success: true }
})
