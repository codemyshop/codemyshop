/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/catalogue/customer/register
 * Creates a customer account in PrestaShop. B2B mode (shop instances, etc.):
 * company + SIRET requis. Mode B2C (codemyshop-demo etc.) : signup minimal
 * without company fields. The mode is determined by PS_B2B_ENABLE in DB
 * (ps_configuration), with fallback to runtimeConfig.public.b2bMode.
 *
 * Direct DB refactor (principle: "Zero PrestaShop webservice" 2026-04-22).
 * Hash password bcrypt $2y$10$ compatible with native PS 8+/9 and with the login
 * refactored (core/server/api/catalogue/customer/login.post.ts).
 */
import { getTenantPsConfig } from '~/server/utils/ps-tenant'
import { sendWelcomeEmail } from '~/server/utils/order-emails'
import { useClientDb } from '~/server/utils/db'
import { isValidActivityCode } from '~/utils/customerActivity'
import { signToken } from '~/server/utils/session-crypto'
import { rateLimit } from '~/server/utils/redis'
import { verifySiret } from '~/server/utils/siret-verify'

export default defineEventHandler(async (event) => {
  // Rate limit anti-énumération + anti-spam : 5 inscriptions / 10 min par IP.
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!(await rateLimit(`register:${ip}`, 5, 600))) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Trop de tentatives d\'inscription. Réessayez dans quelques minutes.',
      data: { code: 'TOO_MANY_REGISTRATION_ATTEMPTS' },
    })
  }

  const body = await readBody<{
    firstname: string
    lastname: string
    email: string
    password: string
    company?: string
    siret?: string
    activityCode?: string
  }>(event)

  const tenant = getTenantPsConfig(event)
  const db = useClientDb(event)

  // Mode B2B/B2C : DB d'abord (PS_B2B_ENABLE), sinon fallback runtimeConfig.
  const b2bRow = await db.get<{ value: string }>(
    `SELECT value FROM ps_configuration WHERE name = 'PS_B2B_ENABLE' LIMIT 1`,
  ).catch(() => null)
  const cfg = useRuntimeConfig(event)
  const isB2b = b2bRow?.value === '1'
    || (b2bRow == null && (cfg.public as any).b2bMode === true)

  // Champs communs toujours requis.
  if (!body.email || !body.password || !body.firstname || !body.lastname) {
    throw createError({ statusCode: 422, message: 'Champs requis : email, password, firstname, lastname' })
  }

  let siretRaw = ''
  if (isB2b) {
    // B2B : company + SIRET obligatoires.
    if (!body.company) {
      throw createError({ statusCode: 422, message: 'Champs requis : company' })
    }
    // Vérification via recherche-entreprises.api.gouv.fr (gratuit, source INSEE).
    // Soft-fail sur panne réseau pour ne pas bloquer un signup légitime.
    siretRaw = (body.siret || '').replace(/\D/g, '')
    if (!siretRaw) {
      throw createError({ statusCode: 422, message: 'Le numéro SIRET est obligatoire (14 chiffres).' })
    }
    if (siretRaw.length !== 14) {
      throw createError({ statusCode: 422, message: 'Le SIRET doit contenir 14 chiffres.' })
    }
    const siretCheck = await verifySiret(siretRaw)
    if (!siretCheck.valid) {
      const isNetworkErr = (siretCheck.error || '').includes('indisponible')
      if (!isNetworkErr) {
        throw createError({
          statusCode: 422,
          message: siretCheck.error || 'Ce SIRET ne correspond à aucun établissement actif.',
        })
      }
      console.warn(`[register] SIRET check soft-fail (network): ${siretCheck.error} — siret=${siretRaw}`)
    }
  }

  // 1. Unicité email (1 SELECT indexé)
  const existing = await db.get<{ id_customer: number }>(
    `SELECT id_customer FROM ps_customer WHERE email = ? AND deleted = 0 LIMIT 1`,
    [body.email],
  )
  if (existing) {
    throw createError({ statusCode: 409, message: 'Un compte existe déjà avec cet email.' })
  }

  // 2. Hash bcrypt $2y$10$ (format PS 8+ natif, remplace l'ancien MD5 legacy)
  const bcrypt = await import('bcryptjs')
  const hashed = (await bcrypt.hash(body.password, 10)).replace(/^\$2a\$/, '$2y$')

  // 3. secure_key PS : md5(rand) 32 chars
  const { createHash, randomBytes } = await import('node:crypto')
  const secureKey = createHash('md5').update(randomBytes(16)).digest('hex')

  // 4. INSERT ps_customer (company/siret = '' si B2C)
  const company = isB2b ? (body.company || '') : ''
  const { insertId } = await db.run(
    `INSERT INTO ps_customer
        (id_shop_group, id_shop, id_gender, id_default_group, id_lang,
         firstname, lastname, email, passwd, company, siret, secure_key,
         active, newsletter, optin, is_guest, deleted, date_add, date_upd)
     VALUES (1, 1, 1, 3, 1, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, 0, NOW(), NOW())`,
    [body.firstname, body.lastname, body.email, hashed, company, siretRaw, secureKey],
  )
  const customerId = Number(insertId)

  // 5. Groupe client par défaut (id_group=3 = Customer PS natif)
  await db.run(
    `INSERT IGNORE INTO ps_customer_group (id_customer, id_group) VALUES (?, 3)`,
    [customerId],
  )

  // 6. Profil B2B étendu : seed l'activité commerciale si fournie.
  // Graceful via la façade (tolère ER_NO_SUCH_TABLE si module non installé).
  // Skip en B2C (l'activité n'a pas de sens pour un particulier).
  if (isB2b && body.activityCode && isValidActivityCode(body.activityCode)) {
    try {
      const { upsertCustomerActivityCodeGraceful } = await import('~/modules/customer-extra/server/utils/customer-extra')
      await upsertCustomerActivityCodeGraceful(customerId, body.activityCode, { event })
    } catch (err: any) {
      console.warn(`[register:${tenant.clientId}] ac_customer_extra seed error:`, err?.message)
    }
  }

  // 7. Session cookie (identique au login refacté)
  const session = {
    customerId,
    email: body.email,
    firstname: body.firstname,
    lastname: body.lastname,
    company,
    userType: 'customer' as const,
  }
  const token = signToken(session)
  const maxAge = 60 * 60 * 24 * 30
  setCookie(event, 'ac_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge,
  })

  // 8. Email de bienvenue (non-bloquant, lookup shop via DB)
  const shopRow = await db.get<{ value: string }>(
    `SELECT value FROM ps_configuration WHERE name = 'PS_SHOP_NAME' LIMIT 1`,
  ).catch(() => null)
  const urlRow = await db.get<{ value: string }>(
    `SELECT value FROM ps_configuration WHERE name = 'PS_SHOP_DOMAIN' LIMIT 1`,
  ).catch(() => null)
  const shopName = shopRow?.value || 'Boutique'
  const shopUrl = urlRow?.value ? `https://${urlRow.value}` : '/'
  sendWelcomeEmail(body.email, body.firstname, company, shopName, shopUrl)
    .catch((e: any) => console.error(`[register:${tenant.clientId}] Email bienvenue échoué:`, e?.message))

  return { success: true, customer: session }
})
