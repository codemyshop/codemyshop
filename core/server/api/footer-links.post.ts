/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

/**
 * POST /api/footer-links
 * Creates a footer link: INSERT master cs_footer, then UPSERT cs_footer_lang
 * for all active languages. Accepts plain i18n strings OR { fr, en, … }.
 */
import { resolveClientId } from '~/server/utils/db'
import { insertLink, upsertLinkLang, getActiveLangs } from '~/modules/footer/server/utils/footer'

function pickLang(v: any, iso: string): string | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'string') return v
  if (typeof v === 'object') return v[iso] ?? v.fr ?? null
  return null
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { column_title, column_position, link_label, link_href, link_badge, link_external, link_position } = body

  if (!link_label || !link_href) {
    throw createError({ statusCode: 400, message: 'link_label and link_href are required' })
  }

  const clientId = resolveClientId(event)
  const idFooter = await insertLink({
    clientId,
    columnPosition: column_position ?? 0,
    linkHref: link_href,
    linkExternal: link_external ? 1 : 0,
    linkPosition: link_position ?? 0,
  }, { event })

  const langs = await getActiveLangs({ event })
  for (const l of langs) {
    await upsertLinkLang(idFooter, l.id_lang, {
      columnTitle: pickLang(column_title, l.iso_code) || '',
      linkLabel: pickLang(link_label, l.iso_code) || '',
      linkBadge: pickLang(link_badge, l.iso_code),
    }, { event })
  }

  return { ok: true, id: idFooter }
})
