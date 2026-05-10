/**
 *
 * PUT /api/header-config/sync — UPSERT header (master + _lang + languages list).
 * Accepts i18n values as plain string (duplicated across all langs) OR in
 * object { fr, en, … }. List of switcher languages: DELETE + INSERT.
 */
import { resolveClientId } from '~/server/utils/db'
import {
  upsertHeader,
  getHeaderIdByClient,
  upsertHeaderLang,
  replaceLocales,
  getActiveLangs,
} from '~/modules/header/server/utils/header'

function pickLang(v: any, iso: string): string | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'string') return v
  if (typeof v === 'object') return v[iso] ?? v.fr ?? null
  return null
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ header: any }>(event)
  if (!body?.header) throw createError({ statusCode: 400, message: 'header requis' })

  const h = body.header
  const clientId = resolveClientId(event)
  const langs = await getActiveLangs({ event })

  // 1. Master header
  await upsertHeader({
    clientId,
    logoSrc: h.logo?.src || null,
    logoHref: h.logo?.href || '/',
    logoClass: h.logo?.class || 'h-10 w-auto max-w-[160px] object-contain',
    topbarShowLanguages: h.topBar?.showLanguages ? 1 : 0,
    topbarAlign: h.topBar?.align === 'center' ? 'center' : 'left',
    contactEmail: h.contactEmail || null,
    featShowSearch: h.features?.showSearch ? 1 : 0,
    featShowWishlist: h.features?.showWishlist ? 1 : 0,
    featShowLogin: h.features?.showLogin !== false ? 1 : 0,
    featShowContact: h.features?.showContact ? 1 : 0,
    featShowCart: h.features?.showCart ? 1 : 0,
    featShowBlogLink: h.features?.showBlogLink ? 1 : 0,
    featShowContactLink: h.features?.showContactLink ? 1 : 0,
    featShowGiftcardLink: h.features?.showGiftcardLink ? 1 : 0,
    featShowStoresLink: h.features?.showStoresLink ? 1 : 0,
    featStickyHeader: h.features?.stickyHeader ? 1 : 0,
    featHeaderLayout: h.features?.headerLayout || 'stacked',
  }, { event })

  const idHeader = await getHeaderIdByClient(clientId, { event })
  if (!idHeader) throw createError({ statusCode: 500, message: 'Impossible de résoudre id_header' })

  // 2. _lang (une ligne par langue active)
  for (const l of langs) {
    await upsertHeaderLang(idHeader, l.id_lang, {
      logoAlt: pickLang(h.logo?.alt, l.iso_code),
      logoText: pickLang(h.logo?.text, l.iso_code),
      topbarMessage: pickLang(h.topBar?.message, l.iso_code),
    }, { event })
  }

  // 3. topbar languages — DELETE + INSERT
  const langItems = Array.isArray(h.topBar?.languages) ? h.topBar.languages : []
  const locales = []
  let pos = 0
  for (const li of langItems) {
    const code = String(li.code || '').trim()
    if (!code) continue
    locales.push({
      code,
      href: li.href || '/',
      position: pos++,
      labelByLang: langs.map((l) => ({
        idLang: l.id_lang,
        label: pickLang(li.label, l.iso_code) || code.toUpperCase(),
      })),
    })
  }
  await replaceLocales(idHeader, locales, { event })

  return { ok: true }
})
