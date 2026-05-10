/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { saveEmailConfig } from '~/server/utils/email-config'

/**
 * PUT /api/bo/email-config/smtp — upsert cs_email_config (singleton).
 *
 * Body : { host?, port?, user?, from?, secure?, from_email?, reply_to? }
 *
 * All fields are optional — a PUT may update only a
 * subset. The others retain their current value (DB if
 * existing, env otherwise — the INSERT...ON CONFLICT clause handles this).
 *
 * loadEmailConfig cache invalidated automatically after save.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event) as {
    host?:       string
    port?:       number
    user?:       string
    from?:       string
    secure?:     boolean
    from_email?: string
    reply_to?:   string
  }

  // Validation port (acceptable range 1-65535)
  if (body.port != null) {
    const p = Number(body.port)
    if (!Number.isFinite(p) || p < 1 || p > 65535) {
      throw createError({ statusCode: 400, statusMessage: 'port invalide (1-65535)' })
    }
  }
  // Validation email format si renseigné
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
  if (body.from && !EMAIL_RE.test(body.from)) {
    throw createError({ statusCode: 400, statusMessage: 'from: email invalide' })
  }
  if (body.from_email && !EMAIL_RE.test(extractEmail(body.from_email))) {
    throw createError({ statusCode: 400, statusMessage: 'from_email: email invalide' })
  }
  if (body.reply_to && !EMAIL_RE.test(extractEmail(body.reply_to))) {
    throw createError({ statusCode: 400, statusMessage: 'reply_to: email invalide' })
  }

  await saveEmailConfig({
    smtp_host:   body.host?.trim() || undefined,
    smtp_port:   body.port,
    smtp_user:   body.user?.trim() || undefined,
    smtp_from:   body.from?.trim() || undefined,
    smtp_secure: body.secure,
    from_email:  body.from_email?.trim() || undefined,
    reply_to:    body.reply_to?.trim() || undefined,
  })

  return { ok: true }
})

/** Extrait l'adresse email d'un format `Name <email@domain.tld>` ou brut. */
function extractEmail(raw: string): string {
  const m = raw.match(/<([^>]+)>/)
  return m ? m[1] : raw.trim()
}
