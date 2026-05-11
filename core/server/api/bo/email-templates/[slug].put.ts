

import { getPgClient } from '~/server/utils/db-pg-adapter'
import { clearEmailTemplateCache } from '~/server/utils/email-template-loader'

const PG_SCHEMA = 'cs_main'

export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug requis' })
  const body = await readBody(event) as {
    id_lang?:       number
    subject?:       string
    html_body?:     string
    plain_body?:    string
    recipient_to?:  string
    recipient_cc?:  string
    recipient_bcc?: string
    
    priority?:      number
  }

  const sql = getPgClient()
  
  const parent = await sql<any[]>`
    SELECT slug FROM ${sql(PG_SCHEMA)}.cs_email_template WHERE slug = ${slug}
  `
  if (parent.length === 0) throw createError({ statusCode: 404, statusMessage: 'Template introuvable' })

  
  if (body?.id_lang) {
    const idLang   = Number(body.id_lang)
    const subject  = String(body.subject   || '').slice(0, 255)
    const htmlBody = String(body.html_body || '')
    const plainBody = body.plain_body == null ? null : String(body.plain_body)

    const updated = await sql<any[]>`
      UPDATE ${sql(PG_SCHEMA)}.cs_email_template_lang
         SET subject = ${subject}, html_body = ${htmlBody}, plain_body = ${plainBody}
       WHERE slug = ${slug} AND id_lang = ${idLang}
       RETURNING slug
    `
    if (updated.length === 0) {
      await sql`
        INSERT INTO ${sql(PG_SCHEMA)}.cs_email_template_lang
          (slug, id_lang, subject, html_body, plain_body)
        VALUES (${slug}, ${idLang}, ${subject}, ${htmlBody}, ${plainBody})
      `
    }
  }

  
  
  
  const recipientsTouched = body?.recipient_to !== undefined
                         || body?.recipient_cc !== undefined
                         || body?.recipient_bcc !== undefined
  const priorityTouched = body?.priority !== undefined && body.priority !== null
  if (recipientsTouched || priorityTouched) {
    const to  = body.recipient_to  != null ? String(body.recipient_to ).slice(0, 4096) : null
    const cc  = body.recipient_cc  != null ? String(body.recipient_cc ).slice(0, 4096) : null
    const bcc = body.recipient_bcc != null ? String(body.recipient_bcc).slice(0, 4096) : null
    const prio = priorityTouched
      ? Math.max(0, Math.min(100, Number(body.priority)))
      : null
    await sql`
      UPDATE ${sql(PG_SCHEMA)}.cs_email_template
         SET recipient_to  = COALESCE(${to},  recipient_to),
             recipient_cc  = COALESCE(${cc},  recipient_cc),
             recipient_bcc = COALESCE(${bcc}, recipient_bcc),
             priority      = COALESCE(${prio}, priority),
             date_upd = NOW()
       WHERE slug = ${slug}
    `
  } else {
    await sql`
      UPDATE ${sql(PG_SCHEMA)}.cs_email_template SET date_upd = NOW() WHERE slug = ${slug}
    `
  }
  
  clearEmailTemplateCache(slug)
  return { ok: true }
})
