/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/catalogue/customer/password-reset-request
 *
 * Step 1 of the forgot-password flow: generates a temporary token and sends an
 * email link. Anti-enumeration: ALWAYS returns `{ success: true }` even
 * if the email does not exist — the client cannot infer the existence of a
 * compte depuis cet endpoint.
 *
 * Stockage : colonnes natives PS `ps_customer.reset_password_token` (40 chars)
 * + `reset_password_validity` (DATETIME). Valid for 1 hour.
 *
 * Lien email : `${shop_url}/reinitialiser-mot-de-passe?token={token}&email={email}`.
 */

import { useClientDb } from '~/server/utils/db'
import { sendPasswordResetEmail } from '~/server/utils/order-emails'
import { rateLimit } from '~/server/utils/redis'

export default defineEventHandler(async (event) => {
  // Rate limit strict : 3 reset / 15 min par IP. Empêche un attaquant de
  // bombarder l'API pour énumérer les emails ou flooder un utilisateur.
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

  // Anti-énumération : on retourne success même si l'email n'existe pas.
  if (!customer) {
    return { success: true }
  }

  const { randomBytes } = await import('node:crypto')
  const token = randomBytes(20).toString('hex') // 40 chars hex, fits ps_customer.reset_password_token

  // Validité 1h. Hardcodée dans le SQL (PG-compat) plutôt que via param :
  // l'adapter db-pg ne couvre que `INTERVAL <littéral> UNIT`, pas
  // `INTERVAL ? UNIT` (placeholder) — qui restait du SQL MariaDB pur
  // et explosait silencieusement côté PG depuis le cutover du 30/04.
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

  // Non-bloquant : si le mail échoue, le token est quand même créé en DB.
  sendPasswordResetEmail(email, customer.firstname || '', resetUrl, shopName)
    .catch((err: any) => console.error(`[password-reset-request:${email}] mail KO:`, err?.message || err))

  return { success: true }
})
