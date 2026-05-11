

import { resolveClientId } from '~/server/utils/db'
import { updateLinkMaster, upsertLinkLang, getActiveLangs } from '~/modules/footer/server/utils/footer'

function pickLang(v: any, iso: string): string | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'string') return v
  if (typeof v === 'object') return v[iso] ?? v.fr ?? null
  return null
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })
  const idFooter = Number(id)
  if (!idFooter) throw createError({ statusCode: 400, message: 'Invalid id' })

  const clientId = resolveClientId(event)

  
  const masterFields: any = {}
  if (body.column_position !== undefined) masterFields.columnPosition = body.column_position
  if (body.link_href !== undefined) masterFields.linkHref = body.link_href
  if (body.link_external !== undefined) masterFields.linkExternal = body.link_external ? 1 : 0
  if (body.link_position !== undefined) masterFields.linkPosition = body.link_position
  if (body.active !== undefined) masterFields.active = body.active ? 1 : 0
  if (Object.keys(masterFields).length) {
    await updateLinkMaster(idFooter, clientId, masterFields, { event })
  }

  
  
  
  const LANG_FIELDS = ['column_title', 'link_label', 'link_badge'] as const
  const langFieldsPresent = LANG_FIELDS.filter((k) => body[k] !== undefined)
  if (langFieldsPresent.length) {
    const langs = await getActiveLangs({ event })
    for (const l of langs) {
      await upsertLinkLang(idFooter, l.id_lang, {
        columnTitle: langFieldsPresent.includes('column_title') ? (pickLang(body.column_title, l.iso_code) || '') : '',
        linkLabel: langFieldsPresent.includes('link_label') ? (pickLang(body.link_label, l.iso_code) || '') : '',
        linkBadge: langFieldsPresent.includes('link_badge') ? pickLang(body.link_badge, l.iso_code) : null,
      }, { event })
    }
  }

  return { ok: true }
})
