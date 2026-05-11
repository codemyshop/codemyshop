

import { enqueueEmail } from '~/server/utils/email-queue'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as {
    to?:           string
    subject?:      string
    html_body?:    string
    plain_body?:   string | null
    from_email?:   string | null
    reply_to?:     string | null
    template_slug?: string | null
    id_lang?:      number | null
    scheduled_at?: string | null
  }
  const to       = String(body?.to || '').trim()
  const subject  = String(body?.subject || '').trim()
  const htmlBody = String(body?.html_body || '')

  if (!to || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(to)) {
    throw createError({ statusCode: 400, statusMessage: 'to: adresse invalide' })
  }
  if (!subject) throw createError({ statusCode: 400, statusMessage: 'subject requis' })
  if (!htmlBody) throw createError({ statusCode: 400, statusMessage: 'html_body requis' })

  const scheduledAt = body.scheduled_at ? new Date(body.scheduled_at) : null
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'scheduled_at invalide (ISO attendu)' })
  }

  const id = await enqueueEmail({
    to,
    subject,
    htmlBody,
    plainBody:    body.plain_body ?? null,
    fromEmail:    body.from_email ?? null,
    replyTo:      body.reply_to ?? null,
    templateSlug: body.template_slug ?? null,
    idLang:       body.id_lang ?? null,
    scheduledAt,
  })

  return { ok: true, id }
})
