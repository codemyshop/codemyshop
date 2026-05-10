/**
 *
 * ProfileSection facade — source of truth `cs_profile_section`, owned by
 * the ac_profilesection module. 100% PostgreSQL runtime since Project #38 phase E.
 *
 * Usage: ACL matrix profile × section for the /hub sidebar. The list of
 * valid sections is provided by the consumers (ALLOWED_SECTIONS) — the facade
 * does not validate section names, that's UI business logic.
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

interface ProfileSectionContext {
  event?: any
  clientId?: string
}

/**
 * Returns the complete matrix: Map<id_profile, sections[]>.
 * If the table does not exist (module not installed on this tenant), returns null
 * to indicate to the consumer that it should fallback.
 */
export async function loadProfileSectionsMap(
  _ctx: ProfileSectionContext = {},
): Promise<Map<number, string[]> | null> {
  try {
    const rows = await usePocPg().execute<{ id_profile: number; section: string }>(sql`
      SELECT id_profile, section FROM cs_main.cs_profile_section
    `)
    const map = new Map<number, string[]>()
    for (const r of rows as any[]) {
      const pid = Number(r.id_profile)
      if (!map.has(pid)) map.set(pid, [])
      map.get(pid)!.push(r.section)
    }
    return map
  } catch (err: any) {
    if (err?.code === '42P01') return null
    throw err
  }
}

/**
 * Verifies that the table exists — used by the PUT to return 503 if
 * absent (case: tenant without the ac_profilesection module installed).
 */
export async function profileSectionTableAvailable(
  _ctx: ProfileSectionContext = {},
): Promise<boolean> {
  try {
    await usePocPg().execute(sql`SELECT 1 FROM cs_main.cs_profile_section LIMIT 1`)
    return true
  } catch (err: any) {
    if (err?.code === '42P01') return false
    throw err
  }
}

/**
 * Replaces the list of sections for a profile — wipe + insert.
 * We maintain 2 queries (DELETE then INSERT batch) because the window is small
 * and reads are tolerant (frontend fallback to 'dashboard').
 */
export async function replaceProfileSections(
  idProfile: number,
  sections: string[],
  _ctx: ProfileSectionContext = {},
): Promise<void> {
  const pg = usePocPg()
  await pg.execute(sql`
    DELETE FROM cs_main.cs_profile_section WHERE id_profile = ${idProfile}
  `)
  if (sections.length === 0) return
  for (const s of sections) {
    await pg.execute(sql`
      INSERT INTO cs_main.cs_profile_section (id_profile, section)
      VALUES (${idProfile}, ${s})
    `)
  }
}
