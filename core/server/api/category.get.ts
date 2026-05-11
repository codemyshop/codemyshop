

import { useClientDb } from '~/server/utils/db'
import { resolveIdLang } from '~/server/utils/lang'
import { listFaqsByParent } from '~/modules/faq/server/utils/faq'

interface CategoryChild {
  id: number
  slug: string
  path: string
  label: string
  

  pilier?: string
}

interface CategoryFaqItem {
  position: number
  question: string
  answer_html: string
}

interface CategoryAggregate {
  total: number
  price_min: number | null
  price_max: number | null
}

export interface CategoryResponse {
  found: boolean
  kind: 'pilier' | 'category'
  pilier: string
  id_category: number | null
  id_parent: number | null
  level_depth: number
  path: string
  slug: string
  name: string
  h1: string
  meta_title: string
  meta_description: string
  intro_html: string | null
  long_description_html: string | null
  
  image_url: string | null
  
  image_webp_srcset: string | null
  
  image_sizes: string | null
  breadcrumb: Array<{ label: string; path: string }>
  children: CategoryChild[]
  aggregate: CategoryAggregate
  faq: CategoryFaqItem[]
}

const COVER_WIDTHS = [400, 600, 800, 1200] as const

function slugifyForFilename(s: string): string {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'category'
}

async function getMasterSlug(db: any, idCategory: number): Promise<string> {
  
  
  const row = await db.get<{ link_rewrite: string }>(
    'SELECT link_rewrite FROM ps_category_lang WHERE id_category = ? AND id_lang = 1 AND id_shop = 1 LIMIT 1',
    [idCategory],
  )
  return slugifyForFilename(row?.link_rewrite || `cat-${idCategory}`)
}

function buildImageUrls(id: number, masterSlug: string): { url: string; srcset: string; sizes: string } {
  const srcset = COVER_WIDTHS.map(w => `/img/c/${id}-${masterSlug}-${w}.webp ${w}w`).join(', ')
  return {
    url: `/img/c/${id}.jpg`,
    srcset,
    
    sizes: '(min-width: 768px) 33vw, 100vw',
  }
}

const pilierCache = new Map<string, { id: number; level_depth: number; id_parent: number } | null>()

async function resolvePilier(db: any, slug: string): Promise<{ id: number; level_depth: number; id_parent: number } | null> {
  if (!slug) return null
  if (pilierCache.has(slug)) return pilierCache.get(slug)!
  const row = await db.get<{ id_category: number; level_depth: number; id_parent: number }>(
    `SELECT c.id_category, c.level_depth, c.id_parent
       FROM ps_category c
       JOIN ps_category_lang cl ON cl.id_category = c.id_category AND cl.id_lang = 1 AND cl.id_shop = 1
      WHERE cl.link_rewrite = ? AND c.active = 1
      ORDER BY c.level_depth ASC, c.id_category ASC
      LIMIT 1`,
    [slug],
  )
  const result = row ? { id: row.id_category, level_depth: row.level_depth, id_parent: row.id_parent } : null
  pilierCache.set(slug, result)
  return result
}

interface CategoryRow {
  id_category: number
  id_parent: number
  level_depth: number
  name: string
  link_rewrite: string
  description: string | null
  additional_description: string | null
  meta_title: string | null
  meta_description: string | null
}

async function walkSegments(
  db: any,
  segments: string[],
  pilierId: number,
  idLang: number,
): Promise<CategoryRow | null> {
  let currentParent = pilierId
  let lastRow: CategoryRow | null = null

  for (const seg of segments) {
    const row = await db.get<CategoryRow>(
      `SELECT c.id_category, c.id_parent, c.level_depth,
              COALESCE(cl.name, clf.name, '')             AS name,
              COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite,
              COALESCE(cl.description, clf.description)   AS description,
              COALESCE(cl.additional_description, clf.additional_description) AS additional_description,
              COALESCE(cl.meta_title, clf.meta_title)         AS meta_title,
              COALESCE(cl.meta_description, clf.meta_description) AS meta_description
         FROM ps_category c
    LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
    LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
        WHERE c.id_parent = ? AND c.active = 1
          AND (cl.link_rewrite = ? OR clf.link_rewrite = ?)
        LIMIT 1`,
      [idLang, currentParent, seg, seg],
    )
    if (!row) return null
    currentParent = row.id_category
    lastRow = row
  }
  return lastRow
}

async function getCustomH1(_db: any, idCategory: number, idLang: number, event?: any): Promise<string | null> {
  try {
    const { getCategoryH1 } = await import('~/modules/category-extra/server/utils/category-extra')
    return await getCategoryH1(idCategory, idLang, { event })
  } catch (e: any) {
    console.error('[category] custom H1 error:', e?.message)
    return null
  }
}

async function loadAncestors(
  db: any,
  idCategory: number,
  pilierId: number,
  idLang: number,
): Promise<Array<{ id: number; name: string; link_rewrite: string }>> {
  const chain: Array<{ id: number; name: string; link_rewrite: string }> = []
  let cursor: number | null = idCategory
  const guard = new Set<number>()
  while (cursor && cursor !== pilierId && !guard.has(cursor)) {
    guard.add(cursor)
    const row = await db.get<{ id_category: number; id_parent: number; name: string; link_rewrite: string }>(
      `SELECT c.id_category, c.id_parent,
              COALESCE(cl.name, clf.name, '')             AS name,
              COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite
         FROM ps_category c
    LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
    LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
        WHERE c.id_category = ? LIMIT 1`,
      [idLang, cursor],
    )
    if (!row) break
    chain.unshift({ id: row.id_category, name: row.name, link_rewrite: row.link_rewrite })
    cursor = row.id_parent
  }
  return chain
}

export default defineEventHandler(async (event): Promise<CategoryResponse> => {
  const idLang = await resolveIdLang(event)
  const query = getQuery(event)

  const pilierKey = String(query.pilier ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (!pilierKey) {
    throw createError({ statusCode: 400, message: 'pilier manquant' })
  }

  const db = useClientDb(event)
  const pilierRow = await resolvePilier(db, pilierKey)
  if (!pilierRow) {
    throw createError({ statusCode: 404, message: `pilier introuvable : ${pilierKey}` })
  }
  const pilier = { id: pilierRow.id }

  const rawPath = String(query.path ?? '').trim().replace(/^\/+|\/+$/g, '')
  const segments = rawPath ? rawPath.split('/').filter(Boolean) : []

  if (segments.length > 4) {
    throw createError({ statusCode: 400, message: 'Profondeur URL > 4 niveaux' })
  }
  for (const seg of segments) {
    if (!/^[a-z0-9-]+$/.test(seg)) {
      throw createError({ statusCode: 400, message: `Slug invalide : ${seg}` })
    }
  }

  
  

  
  if (segments.length === 0) {
    
    
    
    
    const rows = await db.query<CategoryRow>(
      `SELECT c.id_category, c.id_parent, c.level_depth,
              COALESCE(cl.name, clf.name, '')             AS name,
              COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite,
              COALESCE(cl.description, clf.description)   AS description,
              COALESCE(cl.additional_description, clf.additional_description) AS additional_description,
              COALESCE(cl.meta_title, clf.meta_title)     AS meta_title,
              COALESCE(cl.meta_description, clf.meta_description) AS meta_description
         FROM ps_category c
    LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
    LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
        WHERE c.id_parent = ? AND c.active = 1
          AND (
            c.id_category IN (390, 391, 392)
            OR EXISTS (
              SELECT 1 FROM ps_product p
              JOIN ps_category_product cp ON cp.id_product = p.id_product
              JOIN ps_category d ON d.id_category = cp.id_category AND d.active = 1
              WHERE p.active = 1 AND d.nleft BETWEEN c.nleft AND c.nright
            )
          )
        ORDER BY c.position ASC`,
      [idLang, pilier.id],
    )

    
    const pilierMeta = await db.get<CategoryRow>(
      `SELECT c.id_category, c.id_parent, c.level_depth,
              COALESCE(cl.name, clf.name, '')             AS name,
              COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite,
              COALESCE(cl.description, clf.description)   AS description,
              COALESCE(cl.additional_description, clf.additional_description) AS additional_description,
              COALESCE(cl.meta_title, clf.meta_title)     AS meta_title,
              COALESCE(cl.meta_description, clf.meta_description) AS meta_description
         FROM ps_category c
    LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
    LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
        WHERE c.id_category = ? LIMIT 1`,
      [idLang, pilier.id],
    )

    const pilierCustomH1 = await getCustomH1(db, pilier.id, idLang, event)
    const pilierImages = buildImageUrls(pilier.id, await getMasterSlug(db, pilier.id))
    const pilierLabel = pilierMeta?.name || pilierKey

    
    
    
    let pilierAgg: CategoryAggregate = { total: 0, price_min: null, price_max: null }
    try {
      const aggRows = await db.query<{ total: number; price_min: number | null; price_max: number | null }>(
        `WITH RECURSIVE cat_tree AS (
           SELECT id_category FROM ps_category WHERE id_category = ? AND active = 1
           UNION ALL
           SELECT c.id_category FROM ps_category c
           INNER JOIN cat_tree ct ON c.id_parent = ct.id_category
           WHERE c.active = 1
         )
         SELECT COUNT(DISTINCT p.id_product) AS total,
                MIN(p.price) AS price_min,
                MAX(p.price) AS price_max
           FROM cat_tree t
           JOIN ps_category_product cp ON cp.id_category = t.id_category
           JOIN ps_product p ON p.id_product = cp.id_product AND p.active = 1`,
        [pilier.id],
      )
      const r = aggRows[0]
      if (r) pilierAgg = {
        total: Number(r.total ?? 0),
        price_min: r.price_min !== null ? Number(r.price_min) : null,
        price_max: r.price_max !== null ? Number(r.price_max) : null,
      }
    } catch (e: any) {
      console.error('[category] pilier aggregate error:', e?.message)
    }

    
    
    
    let pilierFaq: CategoryFaqItem[] = []
    try {
      const items = await listFaqsByParent('category', pilier.id, idLang, { event })
      pilierFaq = items
        .filter(it => it.question)
        .map(it => ({ position: it.position, question: it.question, answer_html: it.answer }))
    } catch (e: any) {
      if (e?.code !== 'ER_NO_SUCH_TABLE' && e?.errno !== 1146) {
        console.error('[category] pilier FAQ error:', e?.message)
      }
    }

    return {
      found: true,
      kind: 'pilier',
      pilier: pilierKey,
      id_category: pilier.id,
      id_parent: pilierMeta?.id_parent ?? null,
      level_depth: pilierMeta?.level_depth ?? 2,
      path: '',
      slug: '',
      name: pilierLabel,
      h1: pilierCustomH1 || pilierLabel,
      meta_title: pilierMeta?.meta_title || pilierLabel,
      meta_description: pilierMeta?.meta_description || '',
      intro_html: pilierMeta?.description ?? null,
      long_description_html: pilierMeta?.additional_description ?? null,
      image_url: pilierImages.url,
      image_webp_srcset: pilierImages.srcset,
      image_sizes: pilierImages.sizes,
      breadcrumb: [{ label: pilierLabel, path: '' }],
      children: rows.map(r => ({
        id: r.id_category,
        slug: r.link_rewrite,
        path: r.link_rewrite,
        label: r.name,
      })),
      aggregate: pilierAgg,
      faq: pilierFaq,
    }
  }

  
  const leaf = await walkSegments(db, segments, pilier.id, idLang)
  if (!leaf) {
    return {
      found: false,
      kind: 'category',
      pilier: pilierKey,
      id_category: null,
      id_parent: null,
      level_depth: segments.length,
      path: rawPath,
      slug: segments[segments.length - 1],
      name: '',
      h1: '',
      meta_title: '',
      meta_description: '',
      intro_html: null,
      long_description_html: null,
      image_url: null,
      image_webp_srcset: null,
      image_sizes: null,
      breadcrumb: [],
      children: [],
      aggregate: { total: 0, price_min: null, price_max: null },
      faq: [],
    }
  }

  
  const chain = await loadAncestors(db, leaf.id_category, pilier.id, idLang)
  const localizedPath = chain.map(c => c.link_rewrite).join('/')
  
  
  const pilierRoot = await db.get<{ name: string }>(
    `SELECT COALESCE(cl.name, clf.name, '') AS name
       FROM ps_category c
  LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
  LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
      WHERE c.id_category = ? LIMIT 1`,
    [idLang, pilier.id],
  )
  const pilierLabel = pilierRoot?.name || pilierKey
  const breadcrumb: Array<{ label: string; path: string }> = [
    { label: pilierLabel, path: '' },
  ]
  for (let i = 0; i < chain.length; i++) {
    breadcrumb.push({
      label: chain[i].name || chain[i].link_rewrite,
      path: chain.slice(0, i + 1).map(c => c.link_rewrite).join('/'),
    })
  }

  
  
  
  const childRows = await db.query<CategoryRow>(
    `SELECT c.id_category, c.id_parent, c.level_depth,
            COALESCE(cl.name, clf.name, '')             AS name,
            COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite,
            COALESCE(cl.description, clf.description)   AS description,
            COALESCE(cl.additional_description, clf.additional_description) AS additional_description,
            COALESCE(cl.meta_title, clf.meta_title)     AS meta_title,
            COALESCE(cl.meta_description, clf.meta_description) AS meta_description
       FROM ps_category c
  LEFT JOIN ps_category_lang cl  ON cl.id_category  = c.id_category AND cl.id_lang = ? AND cl.id_shop = 1
  LEFT JOIN ps_category_lang clf ON clf.id_category = c.id_category AND clf.id_lang = 1 AND clf.id_shop = 1
      WHERE c.id_parent = ? AND c.active = 1
        AND (
          c.id_category IN (390, 391, 392)
          OR EXISTS (
            SELECT 1 FROM ps_product p
            JOIN ps_category_product cp ON cp.id_product = p.id_product
            JOIN ps_category d ON d.id_category = cp.id_category AND d.active = 1
            WHERE p.active = 1 AND d.nleft BETWEEN c.nleft AND c.nright
          )
        )
      ORDER BY c.position ASC`,
    [idLang, leaf.id_category],
  )

  
  
  
  
  const crossRows = await db.query<CategoryRow & { id_cross_category: number; cross_pos: number }>(
    `SELECT cc.id_cross_category, cc.position AS cross_pos,
            c.id_category, c.id_parent, c.level_depth,
            COALESCE(cl.name, clf.name, '')             AS name,
            COALESCE(cl.link_rewrite, clf.link_rewrite) AS link_rewrite,
            COALESCE(cl.description, clf.description)   AS description,
            COALESCE(cl.additional_description, clf.additional_description) AS additional_description,
            COALESCE(cl.meta_title, clf.meta_title)     AS meta_title,
            COALESCE(cl.meta_description, clf.meta_description) AS meta_description
       FROM cs_category_cross cc
       JOIN ps_category c        ON c.id_category = cc.id_cross_category AND c.active = 1
  LEFT JOIN ps_category_lang cl  ON cl.id_category = cc.id_cross_category AND cl.id_lang = ? AND cl.id_shop = 1
  LEFT JOIN ps_category_lang clf ON clf.id_category = cc.id_cross_category AND clf.id_lang = 1 AND clf.id_shop = 1
      WHERE cc.id_category = ?
      ORDER BY cc.position ASC, cc.id_cross_category ASC`,
    [idLang, leaf.id_category],
  ).catch(() => [])

  
  
  
  interface CrossChild {
    id: number
    slug: string
    path: string
    label: string
    pilier: string
  }
  const crossChildren: CrossChild[] = []
  for (const cr of crossRows) {
    const chain = await loadAncestors(db, cr.id_category,  2, idLang)
    if (chain.length < 1) continue
    const pilierSlug = chain[0].link_rewrite
    const innerPath = chain.slice(1).map((c) => c.link_rewrite).join('/')
    crossChildren.push({
      id: cr.id_category,
      slug: cr.link_rewrite,
      path: innerPath,
      label: cr.name,
      pilier: pilierSlug,
    })
  }

  
  
  
  
  
  const VIRTUAL = new Map<number, 'nouveautes' | 'promotions' | 'meilleures-ventes'>([
    [390, 'nouveautes'], [391, 'promotions'], [392, 'meilleures-ventes'],
  ])
  let agg: CategoryAggregate = { total: 0, price_min: null, price_max: null }
  try {
    const virtualKind = VIRTUAL.get(leaf.id_category)
    if (virtualKind === 'promotions') {
      const rows = await db.query<{ total: number; price_min: number | null; price_max: number | null }>(
        `SELECT COUNT(DISTINCT p.id_product) AS total,
                MIN(p.price) AS price_min, MAX(p.price) AS price_max
           FROM ps_product p
           JOIN ps_specific_price sp ON sp.id_product = p.id_product
            AND sp.reduction > 0
            AND (sp.\`from\` IS NULL OR sp.\`from\` <= NOW())
            AND (sp.\`to\`   IS NULL OR sp.\`to\`   >= NOW())
          WHERE p.active = 1`,
      )
      const r = rows[0]
      if (r) agg = {
        total: Number(r.total ?? 0),
        price_min: r.price_min !== null ? Number(r.price_min) : null,
        price_max: r.price_max !== null ? Number(r.price_max) : null,
      }
    } else if (virtualKind === 'meilleures-ventes') {
      const rows = await db.query<{ total: number; price_min: number | null; price_max: number | null }>(
        `SELECT COUNT(DISTINCT p.id_product) AS total,
                MIN(p.price) AS price_min, MAX(p.price) AS price_max
           FROM ps_product p
           JOIN (SELECT od.product_id
                   FROM ps_order_detail od
                   JOIN ps_orders o ON o.id_order = od.id_order
                  WHERE o.valid = 1 AND o.date_add >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                  GROUP BY od.product_id) bs ON bs.product_id = p.id_product
          WHERE p.active = 1`,
      )
      const r = rows[0]
      if (r) agg = {
        total: Number(r.total ?? 0),
        price_min: r.price_min !== null ? Number(r.price_min) : null,
        price_max: r.price_max !== null ? Number(r.price_max) : null,
      }
    } else if (virtualKind === 'nouveautes') {
      const rows = await db.query<{ total: number; price_min: number | null; price_max: number | null }>(
        `SELECT COUNT(*) AS total, MIN(price) AS price_min, MAX(price) AS price_max
           FROM ps_product WHERE active = 1`,
      )
      const r = rows[0]
      if (r) agg = {
        total: Number(r.total ?? 0),
        price_min: r.price_min !== null ? Number(r.price_min) : null,
        price_max: r.price_max !== null ? Number(r.price_max) : null,
      }
    } else {
      const aggRows = await db.query<{ total: number; price_min: number | null; price_max: number | null }>(
        `WITH RECURSIVE cat_tree AS (
           SELECT id_category FROM ps_category WHERE id_category = ? AND active = 1
           UNION ALL
           SELECT c.id_category FROM ps_category c
           INNER JOIN cat_tree ct ON c.id_parent = ct.id_category
           WHERE c.active = 1
         )
         SELECT COUNT(DISTINCT p.id_product) AS total,
                MIN(p.price) AS price_min,
                MAX(p.price) AS price_max
           FROM cat_tree t
           JOIN ps_category_product cp ON cp.id_category = t.id_category
           JOIN ps_product p ON p.id_product = cp.id_product AND p.active = 1`,
        [leaf.id_category],
      )
      const r = aggRows[0]
      if (r) {
        agg = {
          total: Number(r.total ?? 0),
          price_min: r.price_min !== null ? Number(r.price_min) : null,
          price_max: r.price_max !== null ? Number(r.price_max) : null,
        }
      }
    }
  } catch (e: any) {
    console.error('[category] aggregate error:', e?.message)
  }

  
  let faq: CategoryFaqItem[] = []
  try {
    const items = await listFaqsByParent('category', leaf.id_category, idLang, { event })
    faq = items
      .filter(it => it.question)
      .map(it => ({ position: it.position, question: it.question, answer_html: it.answer }))
  } catch (e: any) {
    if (e?.code !== 'ER_NO_SUCH_TABLE' && e?.errno !== 1146) {
      console.error('[category] FAQ error:', e?.message)
    }
  }

  const leafCustomH1 = await getCustomH1(db, leaf.id_category, idLang, event)
  const leafImages = buildImageUrls(leaf.id_category, await getMasterSlug(db, leaf.id_category))

  return {
    found: true,
    kind: 'category',
    pilier: pilierKey,
    id_category: leaf.id_category,
    id_parent: leaf.id_parent,
    level_depth: leaf.level_depth,
    path: localizedPath,
    slug: leaf.link_rewrite,
    name: leaf.name,
    h1: leafCustomH1 || leaf.name,
    meta_title: leaf.meta_title || `${leaf.name} — ${pilierLabel}`,
    meta_description: leaf.meta_description || '',
    intro_html: leaf.description,
    long_description_html: leaf.additional_description,
    image_url: leafImages.url,
    image_webp_srcset: leafImages.srcset,
    image_sizes: leafImages.sizes,
    breadcrumb,
    children: [
      ...childRows.map(r => ({
        id: r.id_category,
        slug: r.link_rewrite,
        path: `${localizedPath}/${r.link_rewrite}`,
        label: r.name,
      })),
      
      
      
      ...crossChildren.map(c => ({
        id: c.id,
        slug: c.slug,
        path: c.path,
        label: c.label,
        pilier: c.pilier,
      })),
    ],
    aggregate: agg,
    faq,
  }
})
