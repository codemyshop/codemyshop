/**
 *
 * CategoryExtra facade — 1:1 i18n extension of ps_category (custom H1).
 * Sources of truth: `cs_category_extra` + `cs_category_extra_lang`,
 * owned by ac_categoryextra.
 *
 * Tolerates undefined_table 42P01 (the client may not have the module installed).
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

interface CategoryExtraContext {
  event?: any
  clientId?: string
}

function isMissingTable(err: any): boolean {
  // PG undefined_table 42P01
  return err?.code === '42P01'
}

/**
 * Reads the custom H1 of a category for a given language.
 * Returns null if absent (the caller falls back to ps_category_lang.name).
 * Tolerates missing table.
 */
export async function getCategoryH1(
  idCategory: number,
  idLang: number,
  _ctx: CategoryExtraContext = {},
): Promise<string | null> {
  try {
    const rows = await usePocPg().execute<{ h1: string | null }>(sql`
      SELECT h1 FROM cs_main.cs_category_extra_lang
       WHERE id_category = ${idCategory} AND id_lang = ${idLang}
       LIMIT 1
    `)
    const h1 = ((rows as any[])[0]?.h1 || '').trim()
    return h1 ? h1 : null
  } catch (err: any) {
    if (isMissingTable(err)) return null
    throw err
  }
}

/**
 * Upsert custom H1: seed the parent (idempotent) then upsert the _lang.
 * The caller decides isMaster; here we systematically insert the parent
 * via ON CONFLICT DO UPDATE (no-op if already present).
 *
 * Tolerates missing table (silent no-op).
 */
export async function upsertCategoryH1(
  idCategory: number,
  idLang: number,
  h1: string,
  options: { ensureParent?: boolean } = { ensureParent: true },
  _ctx: CategoryExtraContext = {},
): Promise<void> {
  const trimmed = String(h1 || '').slice(0, 255)
  const pg = usePocPg()
  try {
    if (options.ensureParent) {
      await pg.execute(sql`
        INSERT INTO cs_main.cs_category_extra (id_category, date_add, date_upd)
        VALUES (${idCategory}, NOW(), NOW())
        ON CONFLICT (id_category) DO UPDATE SET date_upd = NOW()
      `)
    }
    await pg.execute(sql`
      INSERT INTO cs_main.cs_category_extra_lang (id_category, id_lang, h1)
      VALUES (${idCategory}, ${idLang}, ${trimmed})
      ON CONFLICT (id_category, id_lang) DO UPDATE SET h1 = EXCLUDED.h1
    `)
  } catch (err: any) {
    if (isMissingTable(err)) return
    throw err
  }
}
