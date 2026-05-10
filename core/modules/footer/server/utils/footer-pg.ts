/**
 *
 * Footer facade on PostgreSQL — Phase 1 step 5,
 * flag PG_ENABLED_DOMAINS=footer.
 *
 * read-only surface (link rows / config / socials). Writes remain
 * on MariaDB until full module admin builder cutover.
 *
 * Note: multi-tenant row-level via `client_id`.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

export interface FooterLinkRow {
  id_footer: number
  column_position: number
  link_href: string
  link_external: number
  link_position: number
  column_title: string
  link_label: string
  link_badge: string | null
}

export async function listLinksWithLangPg(
  clientId: string,
  idLang: number,
): Promise<FooterLinkRow[]> {
  const result = await usePocPg().execute<any>(sql`
    SELECT f.id_footer, f.column_position, f.link_href, f.link_external, f.link_position,
           COALESCE(fl.column_title, flf.column_title, '') AS column_title,
           COALESCE(fl.link_label,   flf.link_label,   '') AS link_label,
           COALESCE(fl.link_badge,   flf.link_badge)       AS link_badge
      FROM cs_main.cs_footer f
      LEFT JOIN cs_main.cs_footer_lang fl  ON fl.id_footer  = f.id_footer AND fl.id_lang = ${idLang}
      LEFT JOIN cs_main.cs_footer_lang flf ON flf.id_footer = f.id_footer AND flf.id_lang = 1
     WHERE f.active = 1 AND f.client_id = ${clientId}
     ORDER BY f.column_position ASC, f.link_position ASC
  `)
  return ((result as any) as any[]).map((r) => ({
    id_footer: Number(r.id_footer),
    column_position: Number(r.column_position),
    link_href: String(r.link_href),
    link_external: Number(r.link_external),
    link_position: Number(r.link_position),
    column_title: String(r.column_title ?? ''),
    link_label: String(r.link_label ?? ''),
    link_badge: r.link_badge,
  }))
}

export interface FooterConfigRow {
  id_footer_config: number
  footer_theme: string
  logo_src: string | null
  logo_href: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_address: string | null
  contact_cta_href: string | null
  description: string | null
  hours: string | null
  logo_alt: string | null
  contact_cta_label: string | null
  bottombar_copyright: string | null
}

export async function getConfigWithLangPg(
  clientId: string,
  idLang: number,
): Promise<FooterConfigRow | null> {
  const result = await usePocPg().execute<any>(sql`
    SELECT c.id_footer_config, c.footer_theme, c.logo_src, c.logo_href,
           c.contact_email, c.contact_phone, c.contact_address, c.contact_cta_href,
           COALESCE(cl.description,         clf.description)         AS description,
           COALESCE(cl.hours,               clf.hours)               AS hours,
           COALESCE(cl.logo_alt,            clf.logo_alt)            AS logo_alt,
           COALESCE(cl.contact_cta_label,   clf.contact_cta_label)   AS contact_cta_label,
           COALESCE(cl.bottombar_copyright, clf.bottombar_copyright) AS bottombar_copyright
      FROM cs_main.cs_footer_config c
      LEFT JOIN cs_main.cs_footer_config_lang cl  ON cl.id_footer_config  = c.id_footer_config AND cl.id_lang = ${idLang}
      LEFT JOIN cs_main.cs_footer_config_lang clf ON clf.id_footer_config = c.id_footer_config AND clf.id_lang = 1
     WHERE c.client_id = ${clientId} AND c.active = 1
     LIMIT 1
  `)
  const r = (result as any)[0]
  if (!r) return null
  return {
    id_footer_config: Number(r.id_footer_config),
    footer_theme: String(r.footer_theme),
    logo_src: r.logo_src,
    logo_href: r.logo_href,
    contact_email: r.contact_email,
    contact_phone: r.contact_phone,
    contact_address: r.contact_address,
    contact_cta_href: r.contact_cta_href,
    description: r.description,
    hours: r.hours,
    logo_alt: r.logo_alt,
    contact_cta_label: r.contact_cta_label,
    bottombar_copyright: r.bottombar_copyright,
  }
}

export async function getConfigIdByClientPg(clientId: string): Promise<number | null> {
  const result = await usePocPg().execute<any>(sql`
    SELECT id_footer_config FROM cs_main.cs_footer_config WHERE client_id = ${clientId} LIMIT 1
  `)
  const r = (result as any)[0]
  return r ? Number(r.id_footer_config) : null
}

export interface FooterSocialRow {
  id_social: number
  platform: string
  href: string
  label: string
}

export async function listSocialsWithLangPg(
  idCfg: number,
  idLang: number,
): Promise<FooterSocialRow[]> {
  const result = await usePocPg().execute<any>(sql`
    SELECT s.id_social, s.platform, s.href,
           COALESCE(sl.label, slf.label, s.platform) AS label
      FROM cs_main.cs_footer_social s
      LEFT JOIN cs_main.cs_footer_social_lang sl  ON sl.id_social  = s.id_social AND sl.id_lang = ${idLang}
      LEFT JOIN cs_main.cs_footer_social_lang slf ON slf.id_social = s.id_social AND slf.id_lang = 1
     WHERE s.id_footer_config = ${idCfg} AND s.active = 1
     ORDER BY s.position ASC
  `)
  return ((result as any) as any[]).map((r) => ({
    id_social: Number(r.id_social),
    platform: String(r.platform),
    href: String(r.href),
    label: String(r.label),
  }))
}
