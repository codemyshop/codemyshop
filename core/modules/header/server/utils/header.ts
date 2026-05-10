/**
 *
 * Header facade — header builder config.
 * Sources : `cs_header` (master clientId-scoped) + `_lang` + `_locale`
 * + `_locale_lang` (topbar switcher languages).
 *
 * Surface :
 *  - getHeaderWithLang (master + i18n COALESCE)
 * - getHeaderLocales (switcher languages COALESCE _lang)
 *  - upsertHeader (master ON CONFLICT)
 * - getHeaderIdByClient (resolves id_header after upsert)
 *  - upsertHeaderLang (per-lang i18n)
 *  - replaceLocales (purge + reseed locales + locale_lang)
 *  - getActiveLangs
 *
 * Workstream #38 phase E.5 — MariaDB branch dropped, PostgreSQL-only via `usePocPg()`.
 * Schema cible : `cs_main.cs_header*` + `cs_main.ps_lang`.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

interface HeaderContext {
  event?: any
  clientId?: string
}

export interface HeaderRow {
  id_header: number
  logo_src: string | null
  logo_href: string | null
  logo_class: string | null
  topbar_show_languages: number
  topbar_align: string
  contact_email: string | null
  feat_show_search: number
  feat_show_wishlist: number
  feat_show_login: number
  feat_show_contact: number
  feat_show_cart: number
  feat_show_blog_link: number
  feat_show_contact_link: number
  feat_show_giftcard_link: number
  feat_show_stores_link: number
  feat_sticky_header: number
  feat_header_layout: string
  nav_bg_color: string | null
  nav_text_color: string | null
  logo_alt: string | null
  logo_text: string | null
  topbar_message: string | null
}

export async function getHeaderWithLang(
  clientId: string,
  idLang: number,
  _ctx: HeaderContext = {},
): Promise<HeaderRow | null> {
  const result = await usePocPg().execute<any>(sql`
    SELECT h.id_header, h.logo_src, h.logo_href, h.logo_class,
           h.topbar_show_languages, h.topbar_align, h.contact_email,
           h.feat_show_search, h.feat_show_wishlist, h.feat_show_login,
           h.feat_show_contact, h.feat_show_cart,
           h.feat_show_blog_link, h.feat_show_contact_link, h.feat_show_giftcard_link,
           h.feat_show_stores_link,
           h.feat_sticky_header, h.feat_header_layout,
           h.nav_bg_color, h.nav_text_color,
           COALESCE(hl.logo_alt,       hlf.logo_alt)       AS logo_alt,
           COALESCE(hl.logo_text,      hlf.logo_text)      AS logo_text,
           COALESCE(hl.topbar_message, hlf.topbar_message) AS topbar_message
      FROM cs_main.cs_header h
      LEFT JOIN cs_main.cs_header_lang hl  ON hl.id_header  = h.id_header AND hl.id_lang = ${idLang}
      LEFT JOIN cs_main.cs_header_lang hlf ON hlf.id_header = h.id_header AND hlf.id_lang = 1
     WHERE h.client_id = ${clientId} AND h.active = 1
     LIMIT 1
  `)
  const r = (result as any[])[0]
  if (!r) return null
  return {
    id_header: Number(r.id_header),
    logo_src: r.logo_src,
    logo_href: r.logo_href,
    logo_class: r.logo_class,
    topbar_show_languages: Number(r.topbar_show_languages),
    topbar_align: String(r.topbar_align),
    contact_email: r.contact_email,
    feat_show_search: Number(r.feat_show_search),
    feat_show_wishlist: Number(r.feat_show_wishlist),
    feat_show_login: Number(r.feat_show_login),
    feat_show_contact: Number(r.feat_show_contact),
    feat_show_cart: Number(r.feat_show_cart),
    feat_show_blog_link: Number(r.feat_show_blog_link ?? 0),
    feat_show_contact_link: Number(r.feat_show_contact_link ?? 0),
    feat_show_giftcard_link: Number(r.feat_show_giftcard_link ?? 0),
    feat_show_stores_link: Number(r.feat_show_stores_link ?? 0),
    feat_sticky_header: Number(r.feat_sticky_header),
    feat_header_layout: String(r.feat_header_layout),
    nav_bg_color: r.nav_bg_color,
    nav_text_color: r.nav_text_color,
    logo_alt: r.logo_alt,
    logo_text: r.logo_text,
    topbar_message: r.topbar_message,
  }
}

export interface HeaderLocale {
  code: string
  href: string
  label: string
}

export async function getHeaderLocales(
  idHeader: number,
  idLang: number,
  _ctx: HeaderContext = {},
): Promise<HeaderLocale[]> {
  const result = await usePocPg().execute<any>(sql`
    SELECT l.code, l.href,
           COALESCE(ll.label, llf.label, l.code) AS label
      FROM cs_main.cs_header_locale l
      LEFT JOIN cs_main.cs_header_locale_lang ll  ON ll.id_header_locale  = l.id_header_locale AND ll.id_lang = ${idLang}
      LEFT JOIN cs_main.cs_header_locale_lang llf ON llf.id_header_locale = l.id_header_locale AND llf.id_lang = 1
     WHERE l.id_header = ${idHeader} AND l.active = 1
     ORDER BY l.position ASC
  `)
  return (result as any[]).map((r) => ({
    code: String(r.code),
    href: String(r.href),
    label: String(r.label),
  }))
}

export interface UpsertHeaderInput {
  clientId: string
  logoSrc: string | null
  logoHref: string
  logoClass: string
  topbarShowLanguages: number
  topbarAlign: string
  contactEmail: string | null
  featShowSearch: number
  featShowWishlist: number
  featShowLogin: number
  featShowContact: number
  featShowCart: number
  featShowBlogLink?: number
  featShowContactLink?: number
  featShowGiftcardLink?: number
  featShowStoresLink?: number
  featStickyHeader: number
  featHeaderLayout: string
}

export async function upsertHeader(input: UpsertHeaderInput, _ctx: HeaderContext = {}): Promise<void> {
  await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_header
      (client_id, logo_src, logo_href, logo_class, topbar_show_languages, topbar_align, contact_email,
       feat_show_search, feat_show_wishlist, feat_show_login, feat_show_contact, feat_show_cart,
       feat_show_blog_link, feat_show_contact_link, feat_show_giftcard_link,
       feat_show_stores_link,
       feat_sticky_header, feat_header_layout, date_add, date_upd)
    VALUES (
      ${input.clientId},
      ${input.logoSrc},
      ${input.logoHref},
      ${input.logoClass},
      ${input.topbarShowLanguages},
      ${input.topbarAlign},
      ${input.contactEmail},
      ${input.featShowSearch},
      ${input.featShowWishlist},
      ${input.featShowLogin},
      ${input.featShowContact},
      ${input.featShowCart},
      ${input.featShowBlogLink ?? 0},
      ${input.featShowContactLink ?? 0},
      ${input.featShowGiftcardLink ?? 0},
      ${input.featShowStoresLink ?? 0},
      ${input.featStickyHeader},
      ${input.featHeaderLayout},
      NOW(), NOW()
    )
    ON CONFLICT (client_id) DO UPDATE SET
      logo_src                = COALESCE(EXCLUDED.logo_src, cs_main.cs_header.logo_src),
      logo_href               = COALESCE(EXCLUDED.logo_href, cs_main.cs_header.logo_href),
      logo_class              = COALESCE(EXCLUDED.logo_class, cs_main.cs_header.logo_class),
      topbar_show_languages   = EXCLUDED.topbar_show_languages,
      topbar_align            = EXCLUDED.topbar_align,
      contact_email           = COALESCE(EXCLUDED.contact_email, cs_main.cs_header.contact_email),
      feat_show_search        = EXCLUDED.feat_show_search,
      feat_show_wishlist      = EXCLUDED.feat_show_wishlist,
      feat_show_login         = EXCLUDED.feat_show_login,
      feat_show_contact       = EXCLUDED.feat_show_contact,
      feat_show_cart          = EXCLUDED.feat_show_cart,
      feat_show_blog_link     = EXCLUDED.feat_show_blog_link,
      feat_show_contact_link  = EXCLUDED.feat_show_contact_link,
      feat_show_giftcard_link = EXCLUDED.feat_show_giftcard_link,
      feat_show_stores_link   = EXCLUDED.feat_show_stores_link,
      feat_sticky_header      = EXCLUDED.feat_sticky_header,
      feat_header_layout      = COALESCE(EXCLUDED.feat_header_layout, cs_main.cs_header.feat_header_layout),
      date_upd                = NOW()
  `)
}

export async function getHeaderIdByClient(clientId: string, _ctx: HeaderContext = {}): Promise<number | null> {
  const result = await usePocPg().execute<any>(sql`
    SELECT id_header FROM cs_main.cs_header WHERE client_id = ${clientId} LIMIT 1
  `)
  const r = (result as any[])[0]
  return r ? Number(r.id_header) : null
}

export async function upsertHeaderLang(
  idHeader: number,
  idLang: number,
  fields: { logoAlt: string | null; logoText: string | null; topbarMessage: string | null },
  _ctx: HeaderContext = {},
): Promise<void> {
  await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_header_lang (id_header, id_lang, logo_alt, logo_text, topbar_message)
    VALUES (${idHeader}, ${idLang}, ${fields.logoAlt}, ${fields.logoText}, ${fields.topbarMessage})
    ON CONFLICT (id_header, id_lang) DO UPDATE SET
      logo_alt       = EXCLUDED.logo_alt,
      logo_text      = EXCLUDED.logo_text,
      topbar_message = EXCLUDED.topbar_message
  `)
}

export interface LocaleInsertInput {
  code: string
  href: string
  position: number
  labelByLang: Array<{ idLang: number; label: string }>
}

/**
 * Complete purge of header locales then re-insertion.
 * Idempotent par construction (DELETE + INSERT).
 */
export async function replaceLocales(
  idHeader: number,
  locales: LocaleInsertInput[],
  _ctx: HeaderContext = {},
): Promise<void> {
  const d = usePocPg()
  await d.execute(sql`DELETE FROM cs_main.cs_header_locale WHERE id_header = ${idHeader}`)
  for (const loc of locales) {
    const idRes = await d.execute<any>(sql`
      INSERT INTO cs_main.cs_header_locale (id_header, code, href, position, active)
      VALUES (${idHeader}, ${loc.code}, ${loc.href}, ${loc.position}, 1)
      RETURNING id_header_locale AS id
    `)
    const idLocale = Number((idRes as any[])[0]?.id || 0)
    for (const lbl of loc.labelByLang) {
      await d.execute(sql`
        INSERT INTO cs_main.cs_header_locale_lang (id_header_locale, id_lang, label)
        VALUES (${idLocale}, ${lbl.idLang}, ${lbl.label})
        ON CONFLICT (id_header_locale, id_lang) DO UPDATE SET label = EXCLUDED.label
      `)
    }
  }
}

export interface ActiveLang {
  id_lang: number
  iso_code: string
}

export async function getActiveLangs(_ctx: HeaderContext = {}): Promise<ActiveLang[]> {
  const result = await usePocPg().execute<any>(sql`
    SELECT id_lang, iso_code FROM cs_main.ps_lang WHERE active = 1
  `)
  return (result as any[]).map((r) => ({
    id_lang: Number(r.id_lang),
    iso_code: String(r.iso_code),
  }))
}
