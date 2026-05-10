/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { insertContactMessage } from '~/modules/headlesscontact/server/utils/headlesscontact'

/**
 * POST /api/contact — Formulaire de contact (DB-direct).
 *
 * Inserts into the cs_headlesscontact_message table of the current instance.
 * Each single-tenant VPS has its own database — no tenant filtering needed.
 */

import { verifySiret } from '~/server/utils/siret-verify'
import { verifyEmailViaSmtp } from '~/server/utils/smtp-verify'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const company = String(body?.company ?? '').trim().slice(0, 200)
  const name    = String(body?.name    ?? '').trim().slice(0, 200)
  const email   = String(body?.email   ?? '').trim().slice(0, 200)
  const phone   = String(body?.phone   ?? '').trim().slice(0, 50)
  const message = String(body?.message ?? '').trim().slice(0, 5000)
  const siret   = String(body?.siret   ?? '').replace(/\D/g, '').slice(0, 14)

  if (!name || !email || !message || !siret) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Champs requis manquants : nom, email, message, SIRET',
      data: { code: 'MISSING_REQUIRED_FIELDS' },
    })
  }
  if (!EMAIL_RE.test(email)) {
    throw createError({ statusCode: 422, statusMessage: 'Email invalide', data: { code: 'INVALID_EMAIL' } })
  }
  if (siret.length !== 14) {
    throw createError({ statusCode: 422, statusMessage: 'SIRET invalide (14 chiffres requis)', data: { code: 'INVALID_SIRET' } })
  }
  if (message.length < 10) {
    throw createError({ statusCode: 422, statusMessage: 'Message trop court (10 caractères minimum)', data: { code: 'MESSAGE_TOO_SHORT' } })
  }

  const siretCheck = await verifySiret(siret)
  if (!siretCheck.valid) {
    throw createError({
      statusCode: 422,
      statusMessage: siretCheck.error || 'SIRET introuvable au registre des entreprises',
      data: { code: 'SIRET_NOT_FOUND' },
    })
  }

  const emailCheck = await verifyEmailViaSmtp(email)
  if (emailCheck.status === 'rejected') {
    throw createError({ statusCode: 422, statusMessage: "Cette adresse email n'existe pas", data: { code: 'EMAIL_NOT_EXISTS' } })
  }

  const ip = (
    getRequestHeader(event, 'x-forwarded-for')?.split(',')[0].trim()
    || getRequestHeader(event, 'x-real-ip')
    || event.node.req.socket?.remoteAddress
    || ''
  ).slice(0, 45)
  const userAgent = (getRequestHeader(event, 'user-agent') || '').slice(0, 500)

  try {
    const id = await insertContactMessage(
      {
        company: company || null,
        siret,
        name,
        email,
        phone: phone || null,
        message,
        ipAddress: ip || null,
        userAgent: userAgent || null,
        emailVerifiedStatus: emailCheck.status,
      },
      { event },
    )
    return { success: true, id }
  }
  catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur DB inconnue'
    console.error('[contact] INSERT failed:', msg)
    throw createError({
      statusCode: 503,
      statusMessage: 'Service temporairement indisponible — réessayez dans quelques minutes',
      data: { code: 'SERVICE_UNAVAILABLE' },
    })
  }
})
