/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { getPgClient } from '~/server/utils/db-pg-adapter'
import { clearEmailTemplateCache } from '~/server/utils/email-template-loader'

const PG_SCHEMA = 'cs_main'

/**
 * PUT /api/bo/email-templates/:slug — sauvegarde sujet + html_body + plain_body
 * for a language, AND (optionally) recipient_to/cc/bcc on the parent.
 *
 * Body :
 *   { id_lang, subject, html_body, plain_body? }                     ← maj _lang seul
 *   { recipient_to?, recipient_cc?, recipient_bcc? }                  ← maj parent seul
 * or both combined.
 *
 * Update-or-insert into cs_email_template_lang to allow adding
 * a missing language. Updates cs_email_template.date_upd in the process.
 */
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
    /** 0=critique, 50=standard, 100=marketing. Clamp 0..100. */
    priority?:      number
  }

  const sql = getPgClient()
  // Checks that the parent template exists
  const parent = await sql<any[]>`
    SELECT slug FROM ${sql(PG_SCHEMA)}.cs_email_template WHERE slug = ${slug}
  `
  if (parent.length === 0) throw createError({ statusCode: 404, statusMessage: 'Template introuvable' })

  // ── Update _lang content (if id_lang provided) ──────────────────────────
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

  // ── Update recipients + priority on parent (if provided) ───────────
  // Raw CSV on the recipients side (validation on code side at send time). Priority
  // clamped 0..100 defensively.
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
  // Invalidates the loader cache → next send reads the fresh version.
  clearEmailTemplateCache(slug)
  return { ok: true }
})
