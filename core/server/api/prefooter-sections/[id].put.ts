

import {
  updateLimitItems,
  touchSection,
  upsertSectionLang,
  getActiveLangs,
} from '~/modules/prefooter-section/server/utils/prefooter-section'

function pickLang(v: any, iso: string): string | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'string') return v
  if (typeof v === 'object') return v[iso] ?? v.fr ?? null
  return null
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(Number(id))) {
    throw createError({ statusCode: 400, message: 'id (number) requis' })
  }
  const idSection = Number(id)

  const body = await readBody<{ title?: any; subtitle?: any; limitItems?: number }>(event)
  if (!body || (body.title === undefined && body.subtitle === undefined && body.limitItems === undefined)) {
    throw createError({ statusCode: 400, message: 'Au moins un champ requis' })
  }

  if (body.limitItems !== undefined) {
    await updateLimitItems(idSection, body.limitItems, { event })
  } else {
    await touchSection(idSection, { event })
  }

  if (body.title !== undefined || body.subtitle !== undefined) {
    const langs = await getActiveLangs({ event })
    for (const l of langs) {
      const title    = body.title    !== undefined ? pickLang(body.title,    l.iso_code) : undefined
      const subtitle = body.subtitle !== undefined ? pickLang(body.subtitle, l.iso_code) : undefined
      await upsertSectionLang(idSection, l.id_lang, title, subtitle, { event })
    }
  }

  return { ok: true, id: idSection }
})
