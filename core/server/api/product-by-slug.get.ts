

import { resolveIdLang } from '~/server/utils/lang'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const slug = String(q.slug ?? '').trim()

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return { found: false }
  }

  const db = useClientDb(event)
  const idLang = await resolveIdLang(event)

  
  
  
  
  
  const m = slug.match(/^(.+)-(\d+)$/)
  const slugPrefix = m ? m[1] : null
  const idFromSlug = m ? Number(m[2]) : null

  try {
    let rows: Array<{ id_product: number; name: string; id_category_default: number }> = []

    if (idFromSlug && idFromSlug > 0 && slugPrefix) {
      const candidate = await db.query<{ id_product: number; name: string; id_category_default: number; link_rewrite: string }>(
        `SELECT p.id_product, p.id_category_default, pl.name, pl.link_rewrite
           FROM ps_product p
           JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ?
          WHERE p.id_product = ? AND p.active = 1
          LIMIT 1`,
        [idLang, idFromSlug],
      )
      const fallback = (!candidate.length && idLang !== 1)
        ? await db.query<{ id_product: number; name: string; id_category_default: number; link_rewrite: string }>(
          `SELECT p.id_product, p.id_category_default, pl.name, pl.link_rewrite
             FROM ps_product p
             JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = 1
            WHERE p.id_product = ? AND p.active = 1
            LIMIT 1`,
          [idFromSlug],
        )
        : []
      const hit = candidate[0] ?? fallback[0]
      if (hit && hit.link_rewrite === slugPrefix) {
        rows = [{ id_product: hit.id_product, name: hit.name, id_category_default: hit.id_category_default }]
      }
    }

    if (!rows.length) {
      rows = await db.query<{ id_product: number; name: string; id_category_default: number }>(
        `SELECT p.id_product, p.id_category_default, pl.name
           FROM ps_product p
           JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = ?
          WHERE pl.link_rewrite = ? AND p.active = 1
          LIMIT 1`,
        [idLang, slug],
      )
      if (!rows.length && idLang !== 1) {
        rows = await db.query<{ id_product: number; name: string; id_category_default: number }>(
          `SELECT p.id_product, p.id_category_default, pl.name
             FROM ps_product p
             JOIN ps_product_lang pl ON pl.id_product = p.id_product AND pl.id_lang = 1
            WHERE pl.link_rewrite = ? AND p.active = 1
            LIMIT 1`,
          [slug],
        )
      }
    }
    if (!rows.length) return { found: false }

    const { id_product, name, id_category_default } = rows[0]

    const chain = await db.query<{ id_category: number; id_parent: number; level_depth: number; name: string; link_rewrite: string }>(
      `WITH RECURSIVE chain AS (
         SELECT c.id_category, c.id_parent, c.level_depth,
                COALESCE(cl.name, clf.name, '')             AS name,
                COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite
           FROM ps_category c
      LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ?  AND cl.id_shop = 1
      LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
          WHERE c.id_category = ? AND c.active = 1
         UNION ALL
         SELECT c2.id_category, c2.id_parent, c2.level_depth,
                COALESCE(cl2.name, clf2.name, '')             AS name,
                COALESCE(cl2.link_rewrite, clf2.link_rewrite) AS link_rewrite
           FROM chain
           JOIN ps_category c2 ON c2.id_category = chain.id_parent AND c2.active = 1
      LEFT JOIN ps_category_lang cl2  ON cl2.id_category  = c2.id_category AND cl2.id_lang = ?  AND cl2.id_shop = 1
      LEFT JOIN ps_category_lang clf2 ON clf2.id_category = c2.id_category AND clf2.id_lang = 1 AND clf2.id_shop = 1
          WHERE c2.level_depth >= 2
       )
       SELECT * FROM chain ORDER BY level_depth ASC`,
      [idLang, id_category_default, idLang],
    )

    const pilierRow = chain.find(c => c.level_depth === 2) ?? null
    const pilier = pilierRow?.link_rewrite ?? ''
    const subChain = chain.filter(c => c.level_depth > 2)

    const breadcrumb: Array<{ label: string; path: string; slug: string }> = []
    if (pilierRow) {
      breadcrumb.push({ label: pilierRow.name, path: '', slug: pilierRow.link_rewrite })
    }
    for (let i = 0; i < subChain.length; i++) {
      const row = subChain[i]
      breadcrumb.push({
        label: row.name,
        path: subChain.slice(0, i + 1).map(c => c.link_rewrite).join('/'),
        slug: row.link_rewrite,
      })
    }

    return {
      found: true,
      id_product,
      name,
      pilier,
      breadcrumb,
    }
  } catch (err: any) {
    console.error('[product-by-slug] error:', err?.message)
    return { found: false }
  }
})
