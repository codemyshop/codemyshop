

import { useClientDb } from '~/server/utils/db'

export interface ClientLang {
  id_lang: number
  iso_code: string
  name: string
  is_default: boolean
}

export default defineEventHandler(async (event) => {
  try {
    const db = useClientDb(event)

    
    const confRows = await db.query<{ value: string }>(
      `SELECT value FROM ps_configuration WHERE name = 'PS_LANG_DEFAULT' LIMIT 1`,
    )
    const defaultLangId = confRows.length ? parseInt(confRows[0].value, 10) : 1

    
    const rows = await db.query<{ id_lang: number; iso_code: string; name: string }>(
      `SELECT l.id_lang, l.iso_code, l.name
         FROM ps_lang l
         JOIN ps_lang_shop ls ON l.id_lang = ls.id_lang
        WHERE l.active = 1
        ORDER BY l.id_lang`,
    )

    const langs: ClientLang[] = rows.map(r => ({
      id_lang: r.id_lang,
      iso_code: r.iso_code,
      name: r.name,
      is_default: r.id_lang === defaultLangId,
    }))

    return { langs }
  } catch (err: any) {
    console.error('[client-langs] DB error:', err.message)
    throw createError({ statusCode: 500, message: 'DB error: ' + err.message })
  }
})
