/** @author CodeMyShop <noreply@codemyshop.com> | @copyright 2026 CodeMyShop | @license   AGPL-3.0-or-later */

import { sql } from 'drizzle-orm'
import { usePocPg } from '~/server/db/drizzle-pg'
import { listFaqsByParent } from '~/modules/faq/server/utils/faq'

/** GET /api/bo/categories/:id — details of a PrestaShop category for editing.
 *
 * Sprint 12 — multilang: `?lang=X` selects the `ps_category_lang` row
 * read. Default 1 (PrestaShop master language). Auxiliary lists (parents,
 * groups, FAQ) follow the same language. Non-localized tables
 * (nbProducts, linkedPosts structural) are unchanged.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || id < 2) throw createError({ statusCode: 400, message: 'id invalide' })
  const q = getQuery(event)
  const langId = Math.max(1, Number(q.lang) || 1)
  const d = usePocPg()

  const categoryResult: any = await d.execute(sql`
    SELECT
      c.id_category AS "id", c.id_parent AS "parentId", c.active,
      c.level_depth AS "depth", c.position, c.date_add AS "dateAdd", c.date_upd AS "dateUpd",
      cl.name, cl.description AS "summary", cl.additional_description AS "description", cl.link_rewrite AS "slug",
      cl.meta_title AS "metaTitle", cl.meta_description AS "metaDescription"
    FROM cs_main.ps_category c
    LEFT JOIN cs_main.ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = ${langId} AND cl.id_shop = 1
    WHERE c.id_category = ${id}
  `)
  const category = ((categoryResult as any) as any[])[0]

  if (!category) throw createError({ statusCode: 404, message: 'Catégorie introuvable' })

  // frontPath — URL publique vers la page catégorie sur le tenant.
  // Construite depuis la chaîne d'ancêtres à partir de depth 2 (premier niveau
  // visible, ex: grossiste / marque) jusqu'à la feuille. Slug id_lang=courant
  // pour matcher le routing public localisé. Utilisé par le bouton "Voir" du
  // hub admin — préférable au legacy /c/{id}-{slug} qui ne correspond pas à
  // l'arbo Nuxt.
  try {
    const chainResult: any = await d.execute(sql`
      WITH RECURSIVE chain AS (
        SELECT c.id_category, c.id_parent, c.level_depth, cl.link_rewrite
        FROM cs_main.ps_category c
        LEFT JOIN cs_main.ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = ${langId} AND cl.id_shop = 1
        WHERE c.id_category = ${id}
        UNION ALL
        SELECT c.id_category, c.id_parent, c.level_depth, cl.link_rewrite
        FROM chain ch
        JOIN cs_main.ps_category c ON c.id_category = ch.id_parent
        LEFT JOIN cs_main.ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = ${langId} AND cl.id_shop = 1
        WHERE c.id_category > 1
      )
      SELECT level_depth, link_rewrite FROM chain
      WHERE level_depth >= 2 AND link_rewrite IS NOT NULL AND link_rewrite <> ''
      ORDER BY level_depth ASC
    `)
    const chain = ((chainResult as any) as any[]) ?? []
    const segments = chain.map((r: any) => String(r.link_rewrite || '')).filter(Boolean)
    // Trailing slash convention canonical 2026-04-21 — toutes les URLs catégorie
    // émises par le hub finissent par `/` (aligné SEO + routing public).
    category.frontPath = segments.length ? '/' + segments.join('/') + '/' : null
  } catch {
    category.frontPath = null
  }

  // H1 depuis ac_categoryextra (i18n 1:1 ps_category). Lecture via la façade
  // Drizzle (tolère ER_NO_SUCH_TABLE → null → fallback chaîne vide).
  const { getCategoryH1 } = await import('~/modules/category-extra/server/utils/category-extra')
  category.h1 = (await getCategoryH1(id, langId, { event })) || ''

  // Cover legacy covergen — exposée comme fallback ultime côté front.
  // Le PS native /img/c/{id}-{slug}-800.webp reste prioritaire (calculé
  // côté front depuis le slug + cache-bust). Le legacy ne s'active que si
  // l'image PS native est en 404 (@error côté <img>).
  try {
    const { getLatestDoneCoverForCategory } = await import('~/enterprise/ai/category-covergen/server/utils/category-covergen')
    const legacy = await getLatestDoneCoverForCategory(id, { event })
    category.legacyCoverUrl = legacy?.coverUrl || null
    category.legacyThumbUrl = legacy?.thumbUrl || null
  } catch {
    category.legacyCoverUrl = null
    category.legacyThumbUrl = null
  }

  const parentsResult: any = await d.execute(sql`
    SELECT c.id_category AS "id", cl.name, c.level_depth AS "depth", c.id_parent AS "parentId"
    FROM cs_main.ps_category c
    LEFT JOIN cs_main.ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = ${langId} AND cl.id_shop = 1
    WHERE c.id_category != ${id} AND c.id_category > 1
    ORDER BY c.level_depth, c.position
  `)
  const parents = ((parentsResult as any) as any[]) ?? []

  // Compte toutes les associations ps_category_product (≠ id_category_default).
  const nbProductsResult: any = await d.execute(sql`
    SELECT COUNT(*) AS "n" FROM cs_main.ps_category_product WHERE id_category = ${id}
  `)
  const nbProducts = ((nbProductsResult as any) as any[])[0]

  const groupsResult: any = await d.execute(sql`
    SELECT g.id_group AS "id", gl.name
    FROM cs_main.ps_group g
    LEFT JOIN cs_main.ps_group_lang gl ON gl.id_group = g.id_group AND gl.id_lang = ${langId}
    ORDER BY g.id_group
  `)
  const groups = ((groupsResult as any) as any[]) ?? []

  const groupRowsResult: any = await d.execute(sql`
    SELECT id_group AS "id" FROM cs_main.ps_category_group WHERE id_category = ${id}
  `)
  const groupIds = (((groupRowsResult as any) as any[]) ?? []).map((r: any) => Number(r.id))

  // Sprint 11 — Silo SEO (module ac_cmscategoryextra).
  // Try/catch ER_NO_SUCH_TABLE : si le module n'est pas encore installé sur
  // le tenant courant, on retombe gracieusement sur des listes vides plutôt
  // que de casser l'édition catégorie.
  let faqs: Array<{ id: number; position: number; active: boolean; question: string; answer: string }> = []
  let linkedPosts: Array<{ id: number; position: number; title: string; slug: string; datePublished: string | null; cover: string | null }> = []

  try {
    faqs = await listFaqsByParent('category', id, langId, { event }, { onlyActive: false })
  } catch (err: any) {
    // PG : table absente → 42P01 ; MySQL legacy : ER_NO_SUCH_TABLE / 1146.
    if (
      err?.code !== '42P01' &&
      err?.code !== 'ER_NO_SUCH_TABLE' && err?.errno !== 1146
    ) throw err
  }

  try {
    // Note : pas de référence à cx.image — le schéma de cs_cms_extra varie
    // entre tenants (Hub AC = colonne image présente, Example Shop = absente). On
    // récupère uniquement les colonnes communes (id_cms + date_published).
    // Le cover sera ajouté plus tard via une source standardisée.
    const linkedResult: any = await d.execute(sql`
      SELECT a.id_cms AS "id", a.position,
             cl.meta_title AS "title", cl.link_rewrite AS "slug",
             cx.date_published AS "datePublished"
        FROM cs_main.cs_category_cms a
        JOIN cs_main.ps_cms c ON c.id_cms = a.id_cms
        LEFT JOIN cs_main.ps_cms_lang cl ON cl.id_cms = c.id_cms AND cl.id_lang = ${langId} AND cl.id_shop = 1
        LEFT JOIN cs_main.cs_cms_extra cx ON cx.id_cms = c.id_cms
       WHERE a.id_category = ${id}
       ORDER BY a.position ASC, a.id_cms ASC
    `)
    linkedPosts = (((linkedResult as any) as any[]) ?? []).map((r: any) => ({
      id: Number(r.id),
      position: Number(r.position) || 0,
      title: r.title || `#${r.id}`,
      slug: r.slug || '',
      datePublished: r.datePublished || null,
      cover: null,
    }))
  } catch (err: any) {
    // Tolère table absente (PG 42P01 / MySQL 1146) ET colonne absente (PG 42703
    // / MySQL 1054 — drift de schéma cs_cms_extra entre tenants).
    if (
      err?.code !== '42P01' && err?.code !== '42703' &&
      err?.code !== 'ER_NO_SUCH_TABLE' && err?.errno !== 1146 &&
      err?.code !== 'ER_BAD_FIELD_ERROR' && err?.errno !== 1054
    ) throw err
  }

  return {
    category,
    parents,
    groups,
    groupIds,
    faqs,
    linkedPosts,
    nbProducts: nbProducts?.n ?? 0,
    langId,
  }
})
