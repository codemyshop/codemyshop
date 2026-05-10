/**
 *
 * PrefooterSection facade — typed pre-footer sections + i18n.
 * Sources : `cs_prefooter_section` + `cs_prefooter_section_lang`,
 * Owned by ac_prefootersection.
 *
 * Project #38 cleanup post-MariaDB eviction: 100% PostgreSQL
 * via `usePocPg()` (schema `cs_main`).
 *
 * Surface :
 * - listSectionsWithLang (reading COALESCE _lang+fallback) → delegated to `prefooter-section-pg`
 *  - updateSectionsOrder (POST : ordre + active)
 *  - updateLimitItems (clamp 1..100)
 *  - touchSection
 *  - upsertSectionLang (SET dynamique title/subtitle)
 *  - getActiveLangs
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'
import * as pg from './prefooter-section-pg'

interface PrefooterSectionContext {
  event?: any
  clientId?: string
}

export interface PrefooterSectionWithLang {
  id_section: number
  position: number
  type: string
  limit_items: number
  active: number
  title: string | null
  subtitle: string | null
}

export async function listSectionsWithLang(
  idLang: number,
  includeAll: boolean,
  _ctx: PrefooterSectionContext = {},
): Promise<PrefooterSectionWithLang[]> {
  return pg.listSectionsWithLangPg(idLang, includeAll)
}

export interface SectionOrderUpdate {
  id: number
  position: number
  active: boolean
}

export async function updateSectionsOrder(
  updates: SectionOrderUpdate[],
  _ctx: PrefooterSectionContext = {},
): Promise<number> {
  const d = usePocPg()
  for (const s of updates) {
    await d.execute(sql`
      UPDATE cs_main.cs_prefooter_section
      SET position = ${s.position}, active = ${s.active ? 1 : 0}, date_upd = NOW()
      WHERE id_section = ${s.id}
    `)
  }
  return updates.length
}

export async function updateLimitItems(
  idSection: number,
  limitItems: number,
  _ctx: PrefooterSectionContext = {},
): Promise<void> {
  const n = Math.max(1, Math.min(Number(limitItems) || 6, 100))
  await usePocPg().execute(sql`
    UPDATE cs_main.cs_prefooter_section SET limit_items = ${n}, date_upd = NOW()
    WHERE id_section = ${idSection}
  `)
}

export async function touchSection(idSection: number, _ctx: PrefooterSectionContext = {}): Promise<void> {
  await usePocPg().execute(sql`
    UPDATE cs_main.cs_prefooter_section SET date_upd = NOW() WHERE id_section = ${idSection}
  `)
}

export async function upsertSectionLang(
  idSection: number,
  idLang: number,
  title: string | null | undefined,
  subtitle: string | null | undefined,
  _ctx: PrefooterSectionContext = {},
): Promise<void> {
  const sets: any[] = []
  if (title !== undefined) sets.push(sql`title = EXCLUDED.title`)
  if (subtitle !== undefined) sets.push(sql`subtitle = EXCLUDED.subtitle`)
  if (!sets.length) return
  const setClause = sql.join(sets, sql`, `)
  await usePocPg().execute(sql`
    INSERT INTO cs_main.cs_prefooter_section_lang (id_section, id_lang, title, subtitle)
    VALUES (${idSection}, ${idLang}, ${title ?? null}, ${subtitle ?? null})
    ON CONFLICT (id_section, id_lang) DO UPDATE SET ${setClause}
  `)
}

export interface ActiveLang {
  id_lang: number
  iso_code: string
}

export async function getActiveLangs(_ctx: PrefooterSectionContext = {}): Promise<ActiveLang[]> {
  const result = await usePocPg().execute<any>(sql`
    SELECT id_lang, iso_code FROM cs_main.ps_lang WHERE active = 1
  `)
  return ((result as any) as any[]).map((r) => ({
    id_lang: Number(r.id_lang),
    iso_code: String(r.iso_code),
  }))
}
