/**
 *
 * GET /api/hub/translations/profiles
 * List of cultural profiles by language (translation_profile) for the tenant.
 * If the table does not exist (translation module not installed), returns [].
 * Read through the Drizzle facade.
 */

import { listTranslateProfilesWithLang } from '~/enterprise/misc/translate/server/utils/translate'

export default defineEventHandler(async (event) => {
  const profiles = await listTranslateProfilesWithLang({ event })
  // Format compat consumer : on remappe en snake_case attendu par le BO existant.
  return profiles.map((p) => ({
    id_lang: p.idLang,
    iso_code: p.isoCode,
    profile: p.profile,
    tone: p.tone,
    culture_notes: p.cultureNotes,
    glossary: p.glossary,
    active: p.active,
    lang_name: p.langName,
  }))
})
