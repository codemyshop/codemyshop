/**
 *
 * ac_homepagesection facade on the Postgres side — project #38 Phase 1 step 5,
 * flag PG_ENABLED_DOMAINS=homepage_section.
 *
 * Read-only surface: typed homepage sections + i18n title/subtitle.
 * Writes (back-office /sync.put) remain on MariaDB.
 *
 * Core-only — no client_id scoping (global ac-hub table).
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

export interface SectionWithLangRow {
  id_section: number
  position: number
  type: string
  active: number
  limit_items: number | null
  interval_ms: number | null
  cols: number | null
  height_px: number | null
  cta_href: string | null
  social_handle: string | null
  social_url: string | null
  featured_position: 'left' | 'right' | null
  title: string | null
  subtitle: string | null
}

export async function listSectionsWithLangPg(
  idLang: number,
  includeAll: boolean,
): Promise<SectionWithLangRow[]> {
  const activeClause = includeAll ? sql`` : sql` WHERE s.active = 1`
  const result = await usePocPg().execute<any>(sql`
    SELECT s.id_section, s.position, s.type, s.active,
           s.limit_items, s.interval_ms, s.cols, s.height_px,
           s.cta_href, s.social_handle, s.social_url, s.featured_position,
           COALESCE(sl.title,    slf.title)    AS title,
           COALESCE(sl.subtitle, slf.subtitle) AS subtitle
      FROM cs_main.cs_homepage_section s
      LEFT JOIN cs_main.cs_homepage_section_lang sl  ON sl.id_section  = s.id_section AND sl.id_lang = ${idLang}
      LEFT JOIN cs_main.cs_homepage_section_lang slf ON slf.id_section = s.id_section AND slf.id_lang = 1
      ${activeClause}
     ORDER BY s.position ASC, s.id_section ASC
  `)
  return ((result as any) as any[]).map((r) => ({
    id_section: Number(r.id_section),
    position: Number(r.position),
    type: String(r.type),
    active: Number(r.active),
    limit_items: r.limit_items == null ? null : Number(r.limit_items),
    interval_ms: r.interval_ms == null ? null : Number(r.interval_ms),
    cols: r.cols == null ? null : Number(r.cols),
    height_px: r.height_px == null ? null : Number(r.height_px),
    cta_href: r.cta_href,
    social_handle: r.social_handle,
    social_url: r.social_url,
    featured_position: r.featured_position === 'left' || r.featured_position === 'right' ? r.featured_position : null,
    title: r.title,
    subtitle: r.subtitle,
  }))
}

export async function getSectionTypePg(idSection: number): Promise<string | null> {
  const result = await usePocPg().execute<any>(sql`
    SELECT type FROM cs_main.cs_homepage_section WHERE id_section = ${idSection} LIMIT 1
  `)
  const row = (result as any)[0]
  return row?.type ?? null
}
