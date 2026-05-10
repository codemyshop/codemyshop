/**
 *
 * PUT /api/hub/translations/profiles
 * Body : { id_lang, profile, tone, culture_notes, glossary? }
 * UPSERT to the translation profile via the facade. Requires the translation
 * module installed (table created on install).
 */

import { useClientDb } from '~/server/utils/db'
import { upsertTranslateProfile } from '~/enterprise/misc/translate/server/utils/translate'

export default defineEventHandler(async (event) => {
  const body = await readBody(event) as {
    id_lang?: number
    profile?: string
    tone?: string
    culture_notes?: string
    glossary?: string | null
  }

  const idLang = Number(body.id_lang) || 0
  if (!idLang) throw createError({ statusCode: 400, statusMessage: 'id_lang requis' })

  const db = useClientDb(event)
  // Résoudre iso_code via ps_lang (PS native — pas dans Drizzle pour l'instant).
  const lang = await db.get<{ iso_code: string }>(
    `SELECT iso_code FROM ps_lang WHERE id_lang = ? LIMIT 1`,
    [idLang],
  )
  if (!lang) throw createError({ statusCode: 404, statusMessage: 'id_lang inconnu' })

  await upsertTranslateProfile(
    idLang,
    lang.iso_code,
    String(body.profile || ''),
    String(body.tone || ''),
    String(body.culture_notes || ''),
    body.glossary === null || body.glossary === undefined ? null : String(body.glossary),
    { event },
  )

  return { ok: true }
})
