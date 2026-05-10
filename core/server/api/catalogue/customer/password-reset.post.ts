/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/catalogue/customer/password-reset
 *
 * Step 2 of the forgot-password flow: validates token + email, hashes the new
 * password in bcrypt $2y$10$ (compatible with the native format and refactored login),
 * clears the token. Validity strictly greater than NOW to avoid
 * expired tokens.
 *
 * Returns 401 if token is invalid / expired / already used. No business logic details
 * in the error message (anti-leak).
 */

import { useClientDb } from '~/server/utils/db'
import { sendPasswordChangedEmail } from '~/server/utils/order-emails'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string; token: string; newPassword: string }>(event)
  if (!body.email || !body.token || !body.newPassword) {
    throw createError({ statusCode: 422, message: 'email, token, newPassword requis' })
  }
  if (String(body.newPassword).length < 8) {
    throw createError({ statusCode: 422, message: 'Mot de passe trop court (8 caractères minimum)' })
  }

  const email = String(body.email).trim().toLowerCase()
  const token = String(body.token).trim()
  const db = useClientDb(event)

  const customer = await db.get<{ id_customer: number; firstname: string }>(
    `SELECT id_customer, firstname
       FROM ps_customer
      WHERE email = ?
        AND reset_password_token = ?
        AND reset_password_validity > NOW()
        AND deleted = 0
        AND active = 1
      LIMIT 1`,
    [email, token],
  )

  if (!customer) {
    throw createError({ statusCode: 401, message: 'Lien invalide ou expiré' })
  }

  const bcrypt = await import('bcryptjs')
  const hashed = (await bcrypt.hash(body.newPassword, 10)).replace(/^\$2a\$/, '$2y$')

  await db.run(
    `UPDATE ps_customer
        SET passwd = ?,
            reset_password_token = NULL,
            reset_password_validity = NULL,
            date_upd = NOW()
      WHERE id_customer = ?`,
    [hashed, customer.id_customer],
  )

  // Confirmation de changement (alerte sécurité). Non-bloquant — si l'email
  // échoue, le mot de passe reste changé. Le shopName/accentColor du tenant
  // pourrait être lu depuis ps_configuration mais c'est secondaire ici.
  sendPasswordChangedEmail(email, customer.firstname || '')
    .catch((err: any) => console.error(`[password-reset:${email}] mail confirmation KO:`, err?.message || err))

  return { success: true }
})
