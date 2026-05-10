/**
 *
 * Cmsextra facade — editorial extension CMS articles (page_type,
 * target_avatar_ids, editorial_brief, audio, reel, etc.).
 *
 * Surface :
 * - getCmsExtraForBlogEdit(idCms) — complete editorial details
 *  - getCmsExtraAvatarTargets(idCms) — page_type + target_avatar_ids
 *  - upsertCmsExtra(idCms, fields) — UPSERT idempotent
 *
 * Note: schema drift tolerated between tenants (Hub vs Example Shop). The
 * SELECT cross-domain LEFT JOIN cs_cms_extra in cms.get / articles.get /
 * cms/[category]/[slug].get / bo/categories/[id].get / bo/cms/search.get
 * remain in native SQL within their respective facades (cross-domain
 * acceptable without dependency of the main table).
 *
 * Runtime : 100% PostgreSQL (chantier #38, schema cs_main).
 * Pattern: module-registry (unified facade PG-only via usePocPg()).
 */

import { sql } from 'drizzle-orm'
import { usePocPg } from '../../../../server/db/drizzle-pg'

interface CmsExtraContext {
  event?: any
  clientId?: string
}

export interface CmsExtraEditRow {
  page_type: string | null
  target_avatar_ids: string | null
  editorial_brief: string | null
  author_employee_id: number | null
  social_cover_url: string | null
  ids_product_association: string | null
  ids_cms_association: string | null
  audio_enabled: number | null
  audio_url: string | null
  audio_text: string | null
  audio_score: number | null
  audio_generated_at: string | null
  reel_script: string | null
  reel_enabled: number | null
}

export async function getCmsExtraForBlogEdit(
  idCms: number,
  _ctx: CmsExtraContext = {},
): Promise<CmsExtraEditRow | null> {
  const rows = await usePocPg().execute<CmsExtraEditRow>(sql`
    SELECT page_type, target_avatar_ids, editorial_brief, author_employee_id,
           social_cover_url, ids_product_association, ids_cms_association,
           audio_enabled, audio_url, audio_text, audio_score, audio_generated_at,
           reel_script, reel_enabled
      FROM cs_main.cs_cms_extra WHERE id_cms = ${idCms}
  `)
  const r = (rows as any as CmsExtraEditRow[])[0]
  return r ?? null
}

export interface CmsArticleBySlugRow {
  id_cms: number
  meta_title: string | null
  meta_description: string | null
  content: string | null
  link_rewrite: string | null
  layout: string | null
  image: string | null
  date_published: any
  date_updated: any
}

/**
 * Article CMS public par slug (link_rewrite) + langue : joint
 * ps_cms + ps_cms_lang + cs_cms_extra (LEFT). Returns null if not found
 * or inactive. Intentional cross-domain join (cms-extra extends ps_cms).
 */
export async function getCmsArticleBySlug(
  slug: string,
  idLang: number,
  _ctx: CmsExtraContext = {},
): Promise<CmsArticleBySlugRow | null> {
  const rows = await usePocPg().execute<CmsArticleBySlugRow>(sql`
    SELECT c.id_cms, cl.meta_title, cl.meta_description, cl.content, cl.link_rewrite,
           e.layout, e.image, e.date_published, e.date_updated
      FROM cs_main.ps_cms c
      JOIN cs_main.ps_cms_lang cl ON c.id_cms = cl.id_cms AND cl.id_lang = ${idLang}
      LEFT JOIN cs_main.cs_cms_extra e ON c.id_cms = e.id_cms
     WHERE c.active = 1 AND cl.link_rewrite = ${slug}
     LIMIT 1
  `)
  const r = (rows as any as CmsArticleBySlugRow[])[0]
  return r ?? null
}

export async function getCmsExtraAvatarTargets(
  idCms: number,
  _ctx: CmsExtraContext = {},
): Promise<{ page_type: string | null; target_avatar_ids: string | null } | null> {
  const rows = await usePocPg().execute<{ page_type: string | null; target_avatar_ids: string | null }>(sql`
    SELECT page_type, target_avatar_ids FROM cs_main.cs_cms_extra WHERE id_cms = ${idCms}
  `)
  const r = (rows as any as { page_type: string | null; target_avatar_ids: string | null }[])[0]
  return r ?? null
}

export interface UpsertCmsExtraInput {
  pageType?: string | null
  targetAvatarIds?: any[]
  editorialBrief?: string | null
  authorEmployeeId?: number | null
  idsProductAssociation?: string | null
  idsCmsAssociation?: string | null
  audioEnabled?: number | boolean
  audioUrl?: string | null
  audioText?: string | null
  audioScore?: number | null
  reelScript?: string | null
  reelEnabled?: number | boolean
}

export async function upsertCmsExtra(
  idCms: number,
  body: Record<string, any>,
  _ctx: CmsExtraContext = {},
): Promise<void> {
  const fields: any[] = []
  const values: any[] = []

  const mapping: Array<{ key: string; col: string; transform?: (v: any) => any }> = [
    { key: 'pageType', col: 'page_type' },
    { key: 'targetAvatarIds', col: 'target_avatar_ids', transform: (v: any) => JSON.stringify(Array.isArray(v) ? v : []) },
    { key: 'editorialBrief', col: 'editorial_brief' },
    { key: 'authorEmployeeId', col: 'author_employee_id', transform: (v: any) => v ? Number(v) : null },
    { key: 'idsProductAssociation', col: 'ids_product_association' },
    { key: 'idsCmsAssociation', col: 'ids_cms_association' },
    { key: 'audioEnabled', col: 'audio_enabled', transform: (v: any) => v ? 1 : 0 },
    { key: 'audioUrl', col: 'audio_url' },
    { key: 'audioText', col: 'audio_text' },
    { key: 'audioScore', col: 'audio_score', transform: (v: any) => v ? Number(v) : null },
    { key: 'reelScript', col: 'reel_script' },
    { key: 'reelEnabled', col: 'reel_enabled', transform: (v: any) => v ? 1 : 0 },
  ]

  for (const m of mapping) {
    if (body[m.key] !== undefined) {
      const v = m.transform ? m.transform(body[m.key]) : (body[m.key] || null)
      fields.push(sql.identifier(m.col))
      values.push(v)
    }
  }

  if (fields.length === 0) return

  const pg = usePocPg()

  // Pas de contrainte UNIQUE sur id_cms côté PG — émulation UPSERT par
  // SELECT puis INSERT ou UPDATE. Idempotent.
  const existing = await pg.execute<{ id_ac_cms_extra: number }>(sql`
    SELECT id_ac_cms_extra FROM cs_main.cs_cms_extra
     WHERE id_cms = ${idCms}
     LIMIT 1
  `)
  const existingRow = (existing as any as { id_ac_cms_extra: number }[])[0]

  if (existingRow) {
    // UPDATE des colonnes fournies uniquement
    const setParts = fields.map((col, i) => sql`${col} = ${values[i]}`)
    const setList = sql.join(setParts, sql`, `)
    await pg.execute(sql`
      UPDATE cs_main.cs_cms_extra
         SET ${setList}
       WHERE id_cms = ${idCms}
    `)
    return
  }

  // INSERT
  const colList = sql.join([sql.raw('id_cms'), ...fields], sql`, `)
  const valList = sql.join([sql`${idCms}`, ...values.map(v => sql`${v}`)], sql`, `)

  await pg.execute(sql`
    INSERT INTO cs_main.cs_cms_extra (${colList})
    VALUES (${valList})
  `)
}
