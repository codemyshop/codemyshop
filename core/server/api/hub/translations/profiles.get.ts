

import { listTranslateProfilesWithLang } from '~/enterprise/misc/translate/server/utils/translate'

export default defineEventHandler(async (event) => {
  const profiles = await listTranslateProfilesWithLang({ event })
  
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
