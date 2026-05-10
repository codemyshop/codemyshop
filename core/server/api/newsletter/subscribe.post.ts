/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/newsletter/subscribe — Inscription newsletter (footer / popup).
 *
 * GDPR: a valid consent_text must be present in DB
 * (`cs_footer_config_lang.newsletter_consent_text`) — on snapshot ce texte
 * in the `cs_newsletter_subscriber` row at the time of opt-in to
 * record informed consent. Also stores IP + user-agent + URL.
 *
 * Anti-spam :
 *  - Honeypot field `website` (interdit par convention).
 *  - Validation regex e-mail.
 *
 * Responses:
 * - 200 OK { ok: true } in all legitimate cases (no existence leak
 * of an email — anti-enumeration rule).
 * - 422 if invalid format / honeypot filled.
 */

import { resolveClientId } from '~/server/utils/db'
import { upsertSubscriber } from '~/server/utils/newsletter-subscriber'
import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function loadConsentText(clientId: string, idLang: number): Promise<string | null> {
  const result = await usePocPg().execute<any>(sql`
    SELECT COALESCE(cl.newsletter_consent_text, clf.newsletter_consent_text) AS consent_text
      FROM cs_main.cs_footer_config c
      LEFT JOIN cs_main.cs_footer_config_lang cl
             ON cl.id_footer_config = c.id_footer_config AND cl.id_lang = ${idLang}
      LEFT JOIN cs_main.cs_footer_config_lang clf
             ON clf.id_footer_config = c.id_footer_config AND clf.id_lang = 1
     WHERE c.client_id = ${clientId}
     LIMIT 1
  `)
  const row = ((result as any) as any[])[0]
  return row?.consent_text || null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    email?: string
    locale?: string
    source?: string
    sourceUrl?: string
    website?: string  // honeypot
  }>(event)

  // Honeypot — bot rempli, on retourne 200 muet pour ne rien révéler
  if (body?.website && String(body.website).trim() !== '') {
    return { ok: true }
  }

  const email = String(body?.email ?? '').trim().slice(0, 255)
  if (!email || !EMAIL_RE.test(email)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Email invalide',
      data: { code: 'INVALID_EMAIL' },
    })
  }

  const clientId = resolveClientId(event)
  const { resolveIdLang } = await import('~/server/utils/lang')
  const idLang = await resolveIdLang(event)

  const consentText = await loadConsentText(clientId, idLang)
  if (!consentText) {
    // Le tenant n'a pas configuré de consent_text — on bloque pour éviter
    // d'archiver un opt-in sans preuve de consentement (RGPD).
    throw createError({
      statusCode: 503,
      statusMessage: 'Newsletter non configurée',
      data: { code: 'CONSENT_NOT_CONFIGURED' },
    })
  }

  const ip = (
    getRequestHeader(event, 'x-forwarded-for')?.split(',')[0].trim()
    || getRequestHeader(event, 'x-real-ip')
    || event.node.req.socket?.remoteAddress
    || ''
  ).slice(0, 64)
  const userAgent = (getRequestHeader(event, 'user-agent') || '').slice(0, 512)
  const sourceUrl = (
    body?.sourceUrl
    || getRequestHeader(event, 'referer')
    || ''
  ).slice(0, 512)
  const locale = (body?.locale || '').trim().slice(0, 8) || null
  const source = (body?.source || 'footer').trim().slice(0, 32)

  try {
    await upsertSubscriber({
      clientId,
      email,
      locale,
      source,
      sourceUrl: sourceUrl || null,
      ip: ip || null,
      userAgent: userAgent || null,
      consentText,
      status: 'pending',
    })
  } catch (err: any) {
    console.error('[newsletter/subscribe]', err?.message)
    throw createError({ statusCode: 500, statusMessage: 'Erreur enregistrement' })
  }

  // Réponse uniforme — pas de signal sur "déjà inscrit"
  return { ok: true }
})
