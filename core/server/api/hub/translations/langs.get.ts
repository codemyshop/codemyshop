/**
 *
 * GET /api/hub/translations/langs
 * List of active languages in `ps_lang` for the current tenant.
 */

import { useClientDb } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = useClientDb(event)
  const rows = await db.query<{ id_lang: number; iso_code: string; name: string; language_code: string; locale: string }>(
    `SELECT id_lang, iso_code, name, language_code, locale FROM ps_lang WHERE active = 1 ORDER BY id_lang ASC`,
  )
  return rows
})
