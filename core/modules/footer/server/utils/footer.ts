/**
 *
 * Footer facade — config + columns + links + social.
 * Sources (6 tables) :
 * - `cs_footer` (link rows: 1 row = 1 link per column) + `_lang`
 *  - `cs_footer_config` (master config tenant) + `_lang`
 * - `cs_footer_social` (social icons linked to config) + `_lang`
 *
 * Surface :
 *  - Liens colonnes : listLinksWithLang / insertLink / updateLink / softDeleteLink / upsertLinkLang
 *  - Config : getConfigWithLang / upsertConfig / getConfigIdByClient / upsertConfigLang
 *  - Social : listSocialsWithLang / replaceSocials
 *  - getActiveLangs
 *
 * Chantier #38 phase E.5 : runtime PostgreSQL exclusif (schema cs_main).
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

interface FooterContext {
  event?: any
  clientId?: string
}

// ──────────────────────────────────────────────────────────────
// Liens (colonnes) — cs_footer + _lang
// ──────────────────────────────────────────────────────────────

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

export async function listLinksWithLang(
  clientId: string,
  idLang: number,
  _ctx: FooterContext = {},
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

export interface InsertLinkInput {
  clientId: string
  columnPosition: number
  linkHref: string
  linkExternal: number
  linkPosition: number
}

export async function insertLink(input: InsertLinkInput, _ctx: FooterContext = {}): Promise<number> {
  const result = await usePocPg().execute<any>(sql`
    INSERT INTO cs_main.cs_footer
      (client_id, column_position, link_href, link_external, link_position, active, date_add, date_upd)
    VALUES (${input.clientId}, ${input.columnPosition}, ${input.linkHref}, ${input.linkExternal}, ${input.linkPosition}, 1, NOW(), NOW())
    RETURNING id_footer
  `)
  const r = ((result as any) as any[])[0]
  return Number(r?.id_footer || 0)
}

export interface UpdateLinkMaster {
  columnPosition?: number
  linkHref?: string
  linkExternal?: number
  linkPosition?: number
  active?: number
}

export async function updateLinkMaster(
  idFooter: number,
  clientId: string,
  fields: UpdateLinkMaster,
  _ctx: FooterContext = {},
): Promise<void> {
  const sets: any[] = []
  if (fields.columnPosition !== undefined) sets.push(sql`column_position = ${fields.columnPosition}`)
  if (fields.linkHref !== undefined) sets.push(sql`link_href = ${fields.linkHref}`)
  if (fields.linkExternal !== undefined) sets.push(sql`link_external = ${fields.linkExternal}`)
  if (fields.linkPosition !== undefined) sets.push(sql`link_position = ${fields.linkPosition}`)
  if (fields.active !== undefined) sets.push(sql`active = ${fields.active}`)
  if (!sets.length) return
  sets.push(sql`date_upd = NOW()`)
  const setClause = sql.join(sets, sql`, `)
  await usePocPg().execute(sql`
    UPDATE cs_main.cs_footer SET ${setClause} WHERE id_footer = ${idFooter} AND client_id = ${clientId}
  `)
}

export async function deleteLink(idFooter: number, clientId: string, _ctx: FooterContext = {}): Promise<void> {
  await usePocPg().execute(sql`
    DELETE FROM cs_main.cs_footer WHERE id_footer = ${idFooter} AND client_id = ${clientId}
  `)
}

export interface UpsertLinkLangInput {
  columnTitle: string | null
  linkLabel: string | null
  linkBadge: string | null
}

/**
 * Upsert _lang across 3 i18n columns. `null` is respected (clear).
 * If you don't want to modify a column, pass the old value on the caller side.
 */
export async function upsertLinkLang(
  idFooter: number,
  idLang: number,
  fields: UpsertLinkLangInput,
  _ctx: FooterContext = {},
): Promise<void> {
  await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_footer_lang (id_footer, id_lang, column_title, link_label, link_badge)
    VALUES (${idFooter}, ${idLang}, ${fields.columnTitle ?? ''}, ${fields.linkLabel ?? ''}, ${fields.linkBadge})
    ON CONFLICT (id_footer, id_lang) DO UPDATE SET
      column_title = EXCLUDED.column_title,
      link_label   = EXCLUDED.link_label,
      link_badge   = EXCLUDED.link_badge
  `)
}

// ──────────────────────────────────────────────────────────────
// Config (master + _lang)
// ──────────────────────────────────────────────────────────────

export interface FooterConfigRow {
  id_footer_config: number
  footer_theme: string
  logo_src: string | null
  logo_href: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_address: string | null
  contact_cta_href: string | null
  newsletter_enabled: number
  description: string | null
  hours: string | null
  logo_alt: string | null
  contact_cta_label: string | null
  bottombar_copyright: string | null
  newsletter_title: string | null
  newsletter_description: string | null
  newsletter_placeholder: string | null
  newsletter_cta_label: string | null
  newsletter_consent_text: string | null
}

export async function getConfigWithLang(
  clientId: string,
  idLang: number,
  _ctx: FooterContext = {},
): Promise<FooterConfigRow | null> {
  const result = await usePocPg().execute<any>(sql`
    SELECT c.id_footer_config, c.footer_theme, c.logo_src, c.logo_href,
           c.contact_email, c.contact_phone, c.contact_address, c.contact_cta_href,
           c.newsletter_enabled,
           COALESCE(cl.description,            clf.description)            AS description,
           COALESCE(cl.hours,                  clf.hours)                  AS hours,
           COALESCE(cl.logo_alt,               clf.logo_alt)               AS logo_alt,
           COALESCE(cl.contact_cta_label,      clf.contact_cta_label)      AS contact_cta_label,
           COALESCE(cl.bottombar_copyright,    clf.bottombar_copyright)    AS bottombar_copyright,
           COALESCE(cl.newsletter_title,       clf.newsletter_title)       AS newsletter_title,
           COALESCE(cl.newsletter_description, clf.newsletter_description) AS newsletter_description,
           COALESCE(cl.newsletter_placeholder, clf.newsletter_placeholder) AS newsletter_placeholder,
           COALESCE(cl.newsletter_cta_label,   clf.newsletter_cta_label)   AS newsletter_cta_label,
           COALESCE(cl.newsletter_consent_text,clf.newsletter_consent_text)AS newsletter_consent_text
      FROM cs_main.cs_footer_config c
      LEFT JOIN cs_main.cs_footer_config_lang cl  ON cl.id_footer_config  = c.id_footer_config AND cl.id_lang = ${idLang}
      LEFT JOIN cs_main.cs_footer_config_lang clf ON clf.id_footer_config = c.id_footer_config AND clf.id_lang = 1
     WHERE c.client_id = ${clientId} AND c.active = 1
     LIMIT 1
  `)
  const r = ((result as any) as any[])[0]
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
    newsletter_enabled: Number(r.newsletter_enabled ?? 0),
    description: r.description,
    hours: r.hours,
    logo_alt: r.logo_alt,
    contact_cta_label: r.contact_cta_label,
    bottombar_copyright: r.bottombar_copyright,
    newsletter_title: r.newsletter_title,
    newsletter_description: r.newsletter_description,
    newsletter_placeholder: r.newsletter_placeholder,
    newsletter_cta_label: r.newsletter_cta_label,
    newsletter_consent_text: r.newsletter_consent_text,
  }
}

export interface UpsertConfigInput {
  clientId: string
  footerTheme: string
  logoSrc: string | null
  logoHref: string | null
  contactEmail: string | null
  contactPhone: string | null
  contactAddress: string | null
  contactCtaHref: string | null
  newsletterEnabled?: number
}

export async function upsertConfig(input: UpsertConfigInput, _ctx: FooterContext = {}): Promise<void> {
  const newsletterEnabled = input.newsletterEnabled ?? 0
  await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_footer_config
      (client_id, footer_theme, logo_src, logo_href,
       contact_email, contact_phone, contact_address, contact_cta_href,
       newsletter_enabled, date_add, date_upd)
    VALUES (
      ${input.clientId}, ${input.footerTheme}, ${input.logoSrc}, ${input.logoHref},
      ${input.contactEmail}, ${input.contactPhone}, ${input.contactAddress}, ${input.contactCtaHref},
      ${newsletterEnabled}, NOW(), NOW()
    )
    ON CONFLICT (client_id) DO UPDATE SET
      footer_theme       = EXCLUDED.footer_theme,
      logo_src           = EXCLUDED.logo_src,
      logo_href          = EXCLUDED.logo_href,
      contact_email      = EXCLUDED.contact_email,
      contact_phone      = EXCLUDED.contact_phone,
      contact_address    = EXCLUDED.contact_address,
      contact_cta_href   = EXCLUDED.contact_cta_href,
      newsletter_enabled = EXCLUDED.newsletter_enabled,
      date_upd           = NOW()
  `)
}

export async function getConfigIdByClient(clientId: string, _ctx: FooterContext = {}): Promise<number | null> {
  const result = await usePocPg().execute<any>(sql`
    SELECT id_footer_config FROM cs_main.cs_footer_config WHERE client_id = ${clientId} LIMIT 1
  `)
  const r = ((result as any) as any[])[0]
  return r ? Number(r.id_footer_config) : null
}

export interface UpsertConfigLangInput {
  description: string | null
  hours: string | null
  logoAlt: string | null
  contactCtaLabel: string | null
  bottombarCopyright: string | null
  newsletterTitle?: string | null
  newsletterDescription?: string | null
  newsletterPlaceholder?: string | null
  newsletterCtaLabel?: string | null
  newsletterConsentText?: string | null
}

export async function upsertConfigLang(
  idCfg: number,
  idLang: number,
  fields: UpsertConfigLangInput,
  _ctx: FooterContext = {},
): Promise<void> {
  await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_footer_config_lang
      (id_footer_config, id_lang, description, hours, logo_alt, contact_cta_label, bottombar_copyright,
       newsletter_title, newsletter_description, newsletter_placeholder, newsletter_cta_label, newsletter_consent_text)
    VALUES (${idCfg}, ${idLang}, ${fields.description}, ${fields.hours}, ${fields.logoAlt}, ${fields.contactCtaLabel}, ${fields.bottombarCopyright},
            ${fields.newsletterTitle ?? null}, ${fields.newsletterDescription ?? null},
            ${fields.newsletterPlaceholder ?? null}, ${fields.newsletterCtaLabel ?? null},
            ${fields.newsletterConsentText ?? null})
    ON CONFLICT (id_footer_config, id_lang) DO UPDATE SET
      description             = EXCLUDED.description,
      hours                   = EXCLUDED.hours,
      logo_alt                = EXCLUDED.logo_alt,
      contact_cta_label       = EXCLUDED.contact_cta_label,
      bottombar_copyright     = EXCLUDED.bottombar_copyright,
      newsletter_title        = EXCLUDED.newsletter_title,
      newsletter_description  = EXCLUDED.newsletter_description,
      newsletter_placeholder  = EXCLUDED.newsletter_placeholder,
      newsletter_cta_label    = EXCLUDED.newsletter_cta_label,
      newsletter_consent_text = EXCLUDED.newsletter_consent_text
  `)
}

// ──────────────────────────────────────────────────────────────
// Social
// ──────────────────────────────────────────────────────────────

export interface FooterSocialRow {
  id_social: number
  platform: string
  href: string
  label: string
}

export async function listSocialsWithLang(
  idCfg: number,
  idLang: number,
  _ctx: FooterContext = {},
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

export interface SocialInsertInput {
  platform: string
  href: string
  position: number
  labelByLang: Array<{ idLang: number; label: string }>
}

export async function replaceSocials(
  idCfg: number,
  socials: SocialInsertInput[],
  _ctx: FooterContext = {},
): Promise<void> {
  const d = usePocPg()
  await d.execute(sql`DELETE FROM cs_main.cs_footer_social WHERE id_footer_config = ${idCfg}`)
  for (const s of socials) {
    const insertRes = await d.execute<any>(sql`
      INSERT INTO cs_main.cs_footer_social (id_footer_config, platform, href, position, active)
      VALUES (${idCfg}, ${s.platform}, ${s.href}, ${s.position}, 1)
      RETURNING id_social
    `)
    const idSocial = Number((((insertRes as any) as any[])[0])?.id_social || 0)
    for (const lbl of s.labelByLang) {
      await d.execute(sql`
        INSERT INTO cs_main.cs_footer_social_lang (id_social, id_lang, label)
        VALUES (${idSocial}, ${lbl.idLang}, ${lbl.label})
        ON CONFLICT (id_social, id_lang) DO UPDATE SET label = EXCLUDED.label
      `)
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

export interface ActiveLang {
  id_lang: number
  iso_code: string
}

export async function getActiveLangs(_ctx: FooterContext = {}): Promise<ActiveLang[]> {
  const result = await usePocPg().execute<any>(sql`
    SELECT id_lang, iso_code FROM cs_main.ps_lang WHERE active = 1
  `)
  return ((result as any) as any[]).map((r) => ({
    id_lang: Number(r.id_lang),
    iso_code: String(r.iso_code),
  }))
}
