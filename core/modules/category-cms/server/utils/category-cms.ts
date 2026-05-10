/**
 *
 * CategoryCms Facade — N-N pivot category ↔ CMS article.
 * Source of truth: `cs_main.cs_category_cms` (Postgres),
 * owned by ac_cmscategoryextra.
 *
 * Surface: count + list IDs + replace from either side.
 * LEFT JOINs on ps_cms_lang / ps_category_lang remain on the consumer side
 * while the PS schemas are not in Drizzle.
 *
 * Task #44 — port-drizzle-mariadb-pg: 100% PG facade via `usePocPg()`.
 */

import { eq, sql, asc } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'
import { categoryCmsVaisseau } from '../../../../server/db/schema-pg/category-cms'

interface CategoryCmsContext {
  event?: any
  clientId?: string
}

/**
 * PG: `42P01` = undefined_table. We remain tolerant like the former
 * MariaDB facade (`ER_NO_SUCH_TABLE` / errno 1146) — a consumer that
 * calls the facade before module installation must not crash.
 */
function isMissingTable(err: any): boolean {
  return err?.code === '42P01'
}

/**
 * Counts the articles linked to a category (without filtering on ps_cms.active).
 */
export async function countLinkedCmsForCategory(
  idCategory: number,
  _ctx: CategoryCmsContext = {},
): Promise<number> {
  try {
    const rows = await usePocPg()
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(categoryCmsVaisseau)
      .where(eq(categoryCmsVaisseau.idCategory, idCategory))
    return Number(rows[0]?.total ?? 0)
  } catch (err: any) {
    if (isMissingTable(err)) return 0
    throw err
  }
}

/**
 * Lists the id_cms linked to a category, ordered by position ASC.
 */
export async function listLinkedCmsIds(
  idCategory: number,
  _ctx: CategoryCmsContext = {},
): Promise<Array<{ idCms: number; position: number }>> {
  try {
    const rows = await usePocPg()
      .select({ idCms: categoryCmsVaisseau.idCms, position: categoryCmsVaisseau.position })
      .from(categoryCmsVaisseau)
      .where(eq(categoryCmsVaisseau.idCategory, idCategory))
      .orderBy(asc(categoryCmsVaisseau.position), asc(categoryCmsVaisseau.idCms))
    return rows.map((r) => ({ idCms: Number(r.idCms), position: Number(r.position) }))
  } catch (err: any) {
    if (isMissingTable(err)) return []
    throw err
  }
}

/**
 * Lists the id_category linked to a CMS article, ordered by position ASC.
 */
export async function listLinkedCategoryIds(
  idCms: number,
  _ctx: CategoryCmsContext = {},
): Promise<Array<{ idCategory: number; position: number }>> {
  try {
    const rows = await usePocPg()
      .select({ idCategory: categoryCmsVaisseau.idCategory, position: categoryCmsVaisseau.position })
      .from(categoryCmsVaisseau)
      .where(eq(categoryCmsVaisseau.idCms, idCms))
      .orderBy(asc(categoryCmsVaisseau.position), asc(categoryCmsVaisseau.idCategory))
    return rows.map((r) => ({ idCategory: Number(r.idCategory), position: Number(r.position) }))
  } catch (err: any) {
    if (isMissingTable(err)) return []
    throw err
  }
}

/**
 * Replaces the association from the category side: DELETE WHERE id_category=?
 * then INSERT in batch with incremental position (0, 1, 2, …).
 * Tolerates undefined_table silently (consumers decide to log).
 */
export async function replaceCategoryLinksFromCategory(
  idCategory: number,
  cmsIds: number[],
  _ctx: CategoryCmsContext = {},
): Promise<void> {
  const d = usePocPg()
  const clean = Array.from(new Set(cmsIds.map((n) => Number(n)).filter((n) => n > 0)))
  try {
    await d.delete(categoryCmsVaisseau).where(eq(categoryCmsVaisseau.idCategory, idCategory))
    if (!clean.length) return
    await d.insert(categoryCmsVaisseau).values(
      clean.map((idCms, i) => ({
        idCategory,
        idCms,
        position: i,
        dateAdd: new Date(),
      })),
    )
  } catch (err: any) {
    if (isMissingTable(err)) return
    throw err
  }
}

/**
 * Replaces the association from the CMS side: DELETE WHERE id_cms=? then INSERT
 * with incremental position. ON CONFLICT DO NOTHING because the write from the
 * blog must not break if an association already exists on the category side.
 */
export async function replaceCategoryLinksFromCms(
  idCms: number,
  categoryIds: number[],
  _ctx: CategoryCmsContext = {},
): Promise<void> {
  const d = usePocPg()
  const clean = Array.from(new Set(categoryIds.map((n) => Number(n)).filter((n) => n > 0)))
  try {
    await d.delete(categoryCmsVaisseau).where(eq(categoryCmsVaisseau.idCms, idCms))
    if (!clean.length) return
    // ON CONFLICT DO NOTHING — équivalent PG d'INSERT IGNORE MariaDB.
    await d
      .insert(categoryCmsVaisseau)
      .values(
        clean.map((idCategory, i) => ({
          idCategory,
          idCms,
          position: i,
          dateAdd: new Date(),
        })),
      )
      .onConflictDoNothing()
  } catch (err: any) {
    if (isMissingTable(err)) return
    throw err
  }
}
