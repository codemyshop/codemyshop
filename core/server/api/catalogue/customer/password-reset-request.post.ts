

import { useClientDb } from '~/server/utils/db'
import { sendPasswordResetEmail } from '~/server/utils/order-emails'
import { rateLimit } from '~/server/utils/redis'

export default defineEventHandler(async (event) => {
  
  
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!(await rateLimit(`pwd-reset:${ip}`, 3, 900))) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Trop de demandes de réinitialisation. Réessayez dans 15 minutes.',
      data: { code: 'TOO_MANY_PASSWORD_RESET' },
    })
  }

  const body = await readBody<{ email: string }>(event)
  if (!body.email) throw createError({ statusCode: 422, message: 'Email requis' })

  const email = String(body.email).trim().toLowerCase()
  const db = useClientDb(event)

  const customer = await db.get<{ id_customer: number; firstname: string }>(
    `SELECT id_customer, firstname FROM ps_customer WHERE email = ? AND deleted = 0 AND active = 1 LIMIT 1`,
    [email],
  )

  
  if (!customer) {
    return { success: true }
  }

  const { randomBytes } = await import('node:crypto')
  const token = randomBytes(20).toString('hex') 

  
  
  
  
  await db.run(
    `UPDATE ps_customer
        SET reset_password_token = ?,
            reset_password_validity = NOW() + INTERVAL '1 hour',
            date_upd = NOW()
      WHERE id_customer = ?`,
    [token, customer.id_customer],
  )

  const shopName = (await db.get<{ value: string }>(
    `SELECT value FROM ps_configuration WHERE name = 'PS_SHOP_NAME' LIMIT 1`,
  ).catch(() => null))?.value || 'Boutique'

  const shopDomain = (await db.get<{ value: string }>(
    `SELECT value FROM ps_configuration WHERE name = 'PS_SHOP_DOMAIN' LIMIT 1`,
  ).catch(() => null))?.value || ''
  const shopUrl = shopDomain ? `https://${shopDomain}` : ''
  const resetUrl = `${shopUrl}/reinitialiser-mot-de-passe?token=${token}&email=${encodeURIComponent(email)}`

  
  sendPasswordResetEmail(email, customer.firstname || '', resetUrl, shopName)
    .catch((err: any) => console.error(`[password-reset-request:${email}] mail KO:`, err?.message || err))

  return { success: true }
})
