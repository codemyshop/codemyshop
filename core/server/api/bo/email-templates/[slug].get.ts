/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { getPgClient } from '~/server/utils/db-pg-adapter'

const PG_SCHEMA = 'cs_main'

/**
 * GET /api/bo/email-templates/:slug — template + ses langs FR/EN.
 */
export default defineEventHandler(async (event) => {
  const slug = String(getRouterParam(event, 'slug') || '')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug requis' })
  const sql = getPgClient()
  const tpl = await sql<any[]>`
    SELECT slug, audience, trigger_hint, active,
           recipient_to, recipient_cc, recipient_bcc, priority
    FROM ${sql(PG_SCHEMA)}.cs_email_template WHERE slug = ${slug}
  `
  if (tpl.length === 0) throw createError({ statusCode: 404, statusMessage: 'Template introuvable' })
  const langs = await sql<any[]>`
    SELECT id_lang, subject, html_body, plain_body
    FROM ${sql(PG_SCHEMA)}.cs_email_template_lang WHERE slug = ${slug}
    ORDER BY id_lang
  `
  return { template: tpl[0], langs }
})
