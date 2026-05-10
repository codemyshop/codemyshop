/**
 *
 * ac_header facade on the Postgres side — workstream #38 Phase 1 step 5,
 * flag PG_ENABLED_DOMAINS=header.
 *
 * Read-only surface (back-office builder writes remain on MariaDB until
 * complete module cutover — see headless-modules-ts backlog).
 *
 * Note: multi-tenant row-level via `client_id`. Multiple tenants
 * coexist in the
 * same table — PostgreSQL serves all tenants via WHERE client_id filter.
 *
 * Conversion notable :
 *   - MySQL `COALESCE(a, b, c)` reste identique en PG.
 *   - LEFT JOIN/ORDER BY/LIMIT identiques.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

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
  feat_sticky_header: number
  feat_header_layout: string
  nav_bg_color: string | null
  nav_text_color: string | null
  logo_alt: string | null
  logo_text: string | null
  topbar_message: string | null
}

export async function getHeaderWithLangPg(
  clientId: string,
  idLang: number,
): Promise<HeaderRow | null> {
  const result = await usePocPg().execute<any>(sql`
    SELECT h.id_header, h.logo_src, h.logo_href, h.logo_class,
           h.topbar_show_languages, h.topbar_align, h.contact_email,
           h.feat_show_search, h.feat_show_wishlist, h.feat_show_login,
           h.feat_show_contact, h.feat_show_cart, h.feat_sticky_header, h.feat_header_layout,
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
  const r = (result as any)[0]
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

export async function getHeaderLocalesPg(
  idHeader: number,
  idLang: number,
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
  return ((result as any) as any[]).map((r) => ({
    code: String(r.code),
    href: String(r.href),
    label: String(r.label),
  }))
}

export async function getHeaderIdByClientPg(clientId: string): Promise<number | null> {
  const result = await usePocPg().execute<any>(sql`
    SELECT id_header FROM cs_main.cs_header WHERE client_id = ${clientId} LIMIT 1
  `)
  const r = (result as any)[0]
  return r ? Number(r.id_header) : null
}
