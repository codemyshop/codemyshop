

import { saveEmailConfig } from '~/server/utils/email-config'

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

  
  if (body.port != null) {
    const p = Number(body.port)
    if (!Number.isFinite(p) || p < 1 || p > 65535) {
      throw createError({ statusCode: 400, statusMessage: 'port invalide (1-65535)' })
    }
  }
  
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

function extractEmail(raw: string): string {
  const m = raw.match(/<([^>]+)>/)
  return m ? m[1] : raw.trim()
}
