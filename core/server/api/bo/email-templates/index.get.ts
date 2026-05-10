/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { getPgClient } from '~/server/utils/db-pg-adapter'

const PG_SCHEMA = 'cs_main'

/**
 * GET /api/bo/email-templates — lists email templates from the database.
 * Source unique alimentant /hub/crm/email (DB-first depuis 2026-05-06).
 *
 * Retour : `[{ slug, audience, trigger_hint, label, description, active,
 * subject_fr, html_size }]`. `label` + `description` are the metadata
 * Back office (FR for now, open to i18n via `_lang`). If empty → fallback
 * on the UI side on slug + raw subject.
 */
export default defineEventHandler(async () => {
  const sql = getPgClient()
  const rows = await sql<any[]>`
    SELECT
      t.slug,
      t.audience,
      t.trigger_hint,
      t.active,
      t.recipient_to,
      COALESCE(tl.label, '')       AS label,
      COALESCE(tl.description, '') AS description,
      tl.subject                   AS subject_fr,
      LENGTH(tl.html_body)         AS html_size
    FROM ${sql(PG_SCHEMA)}.cs_email_template t
    LEFT JOIN ${sql(PG_SCHEMA)}.cs_email_template_lang tl
      ON tl.slug = t.slug AND tl.id_lang = 1
    WHERE t.active = 1
    ORDER BY t.audience, t.slug
  `
  return { templates: rows }
})
