

import { getPgClient } from '~/server/utils/db-pg-adapter'

const PG_SCHEMA = 'cs_main'

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
