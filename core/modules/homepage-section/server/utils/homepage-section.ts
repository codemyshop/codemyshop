/**
 *
 * HomepageSection facade — typed homepage sections (hero/features/personas/
 * categories/banners/faq/blog/...) + i18n title/subtitle.
 * Sources : `cs_homepage_section` + `cs_homepage_section_lang`,
 * owned by ac_homepagesection.
 *
 * Runtime PG-only (chantier #38 phase E.5) — DB unique `ac_postgres`,
 * schema `cs_main`. All MariaDB branches have been removed;
 * reads delegate to `homepage-section-pg.ts`, writes
 * utilisent `usePocPg()` en SQL inline.
 *
 * Surface :
 * - listSectionsWithLang (read for /api/homepage-config + /api/homepage-sections)
 * - getSectionType (lookup before decomposition)
 *  - updateSectionsOrder (POST homepage-sections : ordre + active)
 * - updateSectionConfig (UPDATE typed columns: limit/interval/cols/...)
 *  - touchSection (date_upd seul)
 * - upsertSectionLang (INSERT … ON CONFLICT for title/subtitle)
 * - wipeHomepage (purge all 4 tables: core-only guard on the endpoint side)
 *  - insertSection / insertSectionLang (helpers reseed)
 *  - getActiveLangs (utilitaire ps_lang)
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'
import * as pg from './homepage-section-pg'

interface HomepageSectionContext {
  event?: any
  clientId?: string
}

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
  title: string | null
  subtitle: string | null
}

/**
 * Lists sections with their i18n resolved (idLang + fallback id_lang=1).
 * `includeAll=false` filtre `active=1`.
 */
export async function listSectionsWithLang(
  idLang: number,
  includeAll: boolean,
  _ctx: HomepageSectionContext = {},
): Promise<SectionWithLangRow[]> {
  return pg.listSectionsWithLangPg(idLang, includeAll)
}

export async function getSectionType(idSection: number, _ctx: HomepageSectionContext = {}): Promise<string | null> {
  return pg.getSectionTypePg(idSection)
}

export interface SectionOrderUpdate {
  id: number
  position: number
  active: boolean
}

export async function updateSectionsOrder(
  updates: SectionOrderUpdate[],
  _ctx: HomepageSectionContext = {},
): Promise<number> {
  const d = usePocPg()
  for (const s of updates) {
    await d.execute(sql`
      UPDATE cs_main.cs_homepage_section
      SET position = ${s.position}, active = ${s.active ? 1 : 0}, date_upd = NOW()
      WHERE id_section = ${s.id}
    `)
  }
  return updates.length
}

export interface SectionConfig {
  limit_items?: number | null
  interval_ms?: number | null
  cols?: number | null
  height_px?: number | null
  cta_href?: string | null
  social_handle?: string | null
  social_url?: string | null
  featured_position?: 'left' | 'right' | null
}

/**
 * UPDATE typed columns + date_upd. All unprovided values
 * are reset to NULL (mirrors original endpoint behavior).
 */
export async function updateSectionConfig(
  idSection: number,
  cfg: SectionConfig,
  _ctx: HomepageSectionContext = {},
): Promise<void> {
  await usePocPg().execute(sql`
    UPDATE cs_main.cs_homepage_section SET
      limit_items       = ${cfg.limit_items       ?? null},
      interval_ms       = ${cfg.interval_ms       ?? null},
      cols              = ${cfg.cols              ?? null},
      height_px         = ${cfg.height_px         ?? null},
      cta_href          = ${cfg.cta_href          ?? null},
      social_handle     = ${cfg.social_handle     ?? null},
      social_url        = ${cfg.social_url        ?? null},
      featured_position = ${cfg.featured_position ?? null},
      date_upd          = NOW()
    WHERE id_section = ${idSection}
  `)
}

export async function touchSection(idSection: number, _ctx: HomepageSectionContext = {}): Promise<void> {
  await usePocPg().execute(sql`UPDATE cs_main.cs_homepage_section SET date_upd = NOW() WHERE id_section = ${idSection}`)
}

/**
 * Upsert title/subtitle in _lang. If `title` or `subtitle` is `undefined`,
 * the corresponding column is not modified (dynamic SET clause).
 */
export async function upsertSectionLang(
  idSection: number,
  idLang: number,
  title: string | null | undefined,
  subtitle: string | null | undefined,
  _ctx: HomepageSectionContext = {},
): Promise<void> {
  const sets: any[] = []
  if (title !== undefined) sets.push(sql`title = EXCLUDED.title`)
  if (subtitle !== undefined) sets.push(sql`subtitle = EXCLUDED.subtitle`)
  if (!sets.length) return
  const setClause = sql.join(sets, sql`, `)
  await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_homepage_section_lang (id_section, id_lang, title, subtitle)
    VALUES (${idSection}, ${idLang}, ${title ?? null}, ${subtitle ?? null})
    ON CONFLICT (id_section, id_lang) DO UPDATE SET ${setClause}
  `)
}

/**
 * Purge all homepage (4 ordered tables). Used by /sync.put (core-only).
 * The tenant guard must be done on the endpoint side before the call.
 */
export async function wipeHomepage(_ctx: HomepageSectionContext = {}): Promise<void> {
  const d = usePocPg()
  await d.execute(sql`DELETE FROM cs_main.cs_homepage_block_lang`)
  await d.execute(sql`DELETE FROM cs_main.cs_homepage_block`)
  await d.execute(sql`DELETE FROM cs_main.cs_homepage_section_lang`)
  await d.execute(sql`DELETE FROM cs_main.cs_homepage_section`)
}

export interface InsertSectionInput {
  position: number
  type: string
  active?: number
  limit_items?: number | null
  interval_ms?: number | null
  cols?: number | null
  height_px?: number | null
  cta_href?: string | null
  social_handle?: string | null
  social_url?: string | null
}

/**
 * INSERT section + return the generated id. Date_add/upd to NOW.
 */
export async function insertSection(input: InsertSectionInput, _ctx: HomepageSectionContext = {}): Promise<number> {
  const r = await usePocPg().execute<{ id_section: number }>(sql`
    INSERT INTO cs_main.cs_homepage_section
      (position, type, active, limit_items, interval_ms, cols, height_px,
       cta_href, social_handle, social_url, date_add, date_upd)
    VALUES (
      ${input.position}, ${input.type}, ${input.active ?? 1},
      ${input.limit_items ?? null}, ${input.interval_ms ?? null},
      ${input.cols ?? null}, ${input.height_px ?? null},
      ${input.cta_href ?? null}, ${input.social_handle ?? null}, ${input.social_url ?? null},
      NOW(), NOW()
    )
    RETURNING id_section
  `)
  return Number((r as any[])[0]?.id_section ?? 0)
}

export async function insertSectionLang(
  idSection: number,
  idLang: number,
  title: string | null,
  subtitle: string | null,
  _ctx: HomepageSectionContext = {},
): Promise<void> {
  await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_homepage_section_lang (id_section, id_lang, title, subtitle)
    VALUES (${idSection}, ${idLang}, ${title}, ${subtitle})
  `)
}

export interface ActiveLang {
  id_lang: number
  iso_code: string
}

export async function getActiveLangs(_ctx: HomepageSectionContext = {}): Promise<ActiveLang[]> {
  const result = await usePocPg().execute<any>(sql`SELECT id_lang, iso_code FROM cs_main.ps_lang WHERE active = 1`)
  return ((result as any) as any[]).map((r) => ({
    id_lang: Number(r.id_lang),
    iso_code: String(r.iso_code),
  }))
}
