/**
 *
 * ac_prefootersection Postgres-side facade — project #38 Phase 1 step 5,
 * flag PG_ENABLED_DOMAINS=prefooter_section.
 *
 * Read-only surface: typed pre-footer sections + i18n.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

export interface PrefooterSectionWithLang {
  id_section: number
  position: number
  type: string
  limit_items: number
  active: number
  title: string | null
  subtitle: string | null
}

export async function listSectionsWithLangPg(
  idLang: number,
  includeAll: boolean,
): Promise<PrefooterSectionWithLang[]> {
  const activeClause = includeAll ? sql`` : sql` WHERE s.active = 1`
  const result = await usePocPg().execute<any>(sql`
    SELECT s.id_section, s.position, s.type, s.limit_items, s.active,
           COALESCE(sl.title,    slf.title)    AS title,
           COALESCE(sl.subtitle, slf.subtitle) AS subtitle
      FROM cs_main.cs_prefooter_section s
      LEFT JOIN cs_main.cs_prefooter_section_lang sl  ON sl.id_section  = s.id_section AND sl.id_lang = ${idLang}
      LEFT JOIN cs_main.cs_prefooter_section_lang slf ON slf.id_section = s.id_section AND slf.id_lang = 1
      ${activeClause}
     ORDER BY s.position ASC, s.id_section ASC
  `)
  return ((result as any) as any[]).map((r) => ({
    id_section: Number(r.id_section),
    position: Number(r.position),
    type: String(r.type),
    limit_items: Number(r.limit_items),
    active: Number(r.active),
    title: r.title,
    subtitle: r.subtitle,
  }))
}
